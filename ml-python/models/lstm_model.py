"""
Modelo LSTM para detección de patrones temporales/secuenciales.

Procesa secuencias de las últimas N partidas como serie temporal
para predecir la distribución de huesos en la siguiente partida.
"""
import numpy as np
import json
from pathlib import Path
from loguru import logger

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (
    GRID_SIZE, SEQUENCE_LENGTH,
    LSTM_HIDDEN_SIZE, LSTM_NUM_LAYERS, LSTM_DROPOUT,
    LSTM_EPOCHS, LSTM_BATCH_SIZE, LSTM_LEARNING_RATE, LSTM_PATIENCE
)
from models.base_model import BaseModel


# ═══════════════════════════════════════════════════════════
# Arquitectura de Red Neuronal
# ═══════════════════════════════════════════════════════════

class ChickenLSTMNet(nn.Module):
    """
    Red LSTM bidireccional con atención temporal.
    
    Input: Secuencia de N partidas, cada una con 25 posiciones + features extra.
    Output: 25 probabilidades (una por posición del tablero).
    """
    
    def __init__(
        self, 
        input_size: int = 25,
        hidden_size: int = LSTM_HIDDEN_SIZE,
        num_layers: int = LSTM_NUM_LAYERS,
        dropout: float = LSTM_DROPOUT,
    ):
        super().__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM bidireccional
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=True,
        )
        
        # Mecanismo de atención temporal
        self.attention = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1),
        )
        
        # Capas fully connected
        self.fc = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(hidden_size // 2, GRID_SIZE),
            nn.Sigmoid(),
        )
        
        # Inicialización Xavier
        for name, param in self.named_parameters():
            if 'weight' in name and param.dim() >= 2:
                nn.init.xavier_uniform_(param)
            elif 'bias' in name:
                nn.init.zeros_(param)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, input_size)
        Returns:
            (batch, 25) — probabilidad de hueso por posición
        """
        # LSTM
        lstm_out, _ = self.lstm(x)  # (batch, seq_len, hidden*2)
        
        # Atención temporal
        attn_weights = self.attention(lstm_out)  # (batch, seq_len, 1)
        attn_weights = torch.softmax(attn_weights, dim=1)
        context = torch.sum(lstm_out * attn_weights, dim=1)  # (batch, hidden*2)
        
        # Predicción
        out = self.fc(context)  # (batch, 25)
        
        return out


# ═══════════════════════════════════════════════════════════
# Dataset para secuencias de partidas
# ═══════════════════════════════════════════════════════════

class ChickenSequenceDataset(Dataset):
    """
    Dataset de secuencias de partidas para el LSTM.
    
    Cada muestra es una secuencia de SEQUENCE_LENGTH partidas consecutivas,
    y el target es la configuración de huesos de la partida siguiente.
    
    Incluye data augmentation: rotaciones y reflexiones del tablero 5x5.
    """
    
    def __init__(self, bone_matrix: np.ndarray, seq_length: int = SEQUENCE_LENGTH, augment: bool = False):
        self.seq_length = seq_length
        self.augment = augment
        
        # Si augmentamos, expandimos el bone_matrix con transformaciones
        if augment and len(bone_matrix) >= seq_length + 1:
            self.bone_matrix = self._augment_data(bone_matrix)
        else:
            self.bone_matrix = bone_matrix
        
        # Calcular features extra por partida
        self.features = self._compute_sequence_features(self.bone_matrix)
        
        # Número de secuencias válidas
        self.n_sequences = max(0, len(self.bone_matrix) - seq_length)
    
    def _augment_data(self, bone_matrix: np.ndarray) -> np.ndarray:
        """
        Data augmentation para tablero 5x5:
        - Reflexión horizontal
        - Reflexión vertical  
        - Rotación 180°
        Multiplica los datos x4.
        """
        n_games = len(bone_matrix)
        augmented = [bone_matrix]
        
        for game_set in [bone_matrix]:
            # Reflexión horizontal (invertir columnas)
            h_flip = np.zeros_like(game_set)
            for g in range(n_games):
                grid = game_set[g].reshape(5, 5)
                h_flip[g] = np.fliplr(grid).flatten()
            augmented.append(h_flip)
            
            # Reflexión vertical (invertir filas)
            v_flip = np.zeros_like(game_set)
            for g in range(n_games):
                grid = game_set[g].reshape(5, 5)
                v_flip[g] = np.flipud(grid).flatten()
            augmented.append(v_flip)
            
            # Rotación 180°
            rot180 = np.zeros_like(game_set)
            for g in range(n_games):
                grid = game_set[g].reshape(5, 5)
                rot180[g] = np.rot90(grid, 2).flatten()
            augmented.append(rot180)
        
        return np.vstack(augmented)
    
    def _compute_sequence_features(self, bone_matrix: np.ndarray) -> np.ndarray:
        """
        Añade features extra a cada step de la secuencia.
        Input: bone_matrix (n_games, 25)
        Output: (n_games, 25 + extra_features)
        """
        n_games = len(bone_matrix)
        
        # Features adicionales por partida
        extras = []
        for i in range(n_games):
            game = bone_matrix[i]
            bone_positions = np.where(game == 1)[0]
            
            # Centroide de huesos (normalizado)
            if len(bone_positions) > 0:
                rows = bone_positions // 5
                cols = bone_positions % 5
                centroid_r = rows.mean() / 4.0
                centroid_c = cols.mean() / 4.0
                spread = np.std(bone_positions) / 12.0  # Normalizado
            else:
                centroid_r = 0.5
                centroid_c = 0.5
                spread = 0.0
            
            # Entropía de la distribución
            p = game / max(game.sum(), 1)
            p_nonzero = p[p > 0]
            entropy = -np.sum(p_nonzero * np.log2(p_nonzero)) / np.log2(25)
            
            extras.append([centroid_r, centroid_c, spread, entropy])
        
        extras = np.array(extras, dtype=np.float32)
        
        # Concatenar: (n_games, 25) + (n_games, 4) → (n_games, 29)
        return np.hstack([bone_matrix, extras])
    
    def __len__(self):
        return self.n_sequences
    
    def __getitem__(self, idx):
        # Secuencia de entrada
        x = self.features[idx:idx + self.seq_length]  # (seq_len, 29)
        # Target: siguiente partida
        y = self.bone_matrix[idx + self.seq_length]    # (25,)
        
        return (
            torch.FloatTensor(x),
            torch.FloatTensor(y),
        )


# ═══════════════════════════════════════════════════════════
# Modelo LSTM completo
# ═══════════════════════════════════════════════════════════

class LSTMModel(BaseModel):
    """
    Modelo LSTM bidireccional con atención para predicción temporal.
    
    Fortalezas:
    - Detecta patrones secuenciales en la colocación de huesos
    - Memoria a largo plazo de tendencias
    - Atención temporal pesa partidas más relevantes
    """
    
    def __init__(self):
        super().__init__("LSTM")
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.net = None
        self.bone_matrix_cache = None
        self.train_history = []
        self.input_size = 29  # 25 posiciones + 4 extras
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """
        Entrena el LSTM. X e y se ignoran — usa bone_matrix directamente.
        
        kwargs:
            bone_matrix: np.ndarray (n_games, 25) — requerido
        """
        bone_matrix = kwargs.get('bone_matrix')
        if bone_matrix is None:
            logger.error(f"[{self.name}] bone_matrix requerida para entrenar LSTM")
            return {'error': 'bone_matrix required'}
        
        self.bone_matrix_cache = bone_matrix.copy()
        n_games = len(bone_matrix)
        seq_len = min(SEQUENCE_LENGTH, n_games - 2)
        
        if n_games < seq_len + 5:
            logger.warning(f"[{self.name}] Pocos datos ({n_games} partidas) para LSTM")
            return {'error': f'need at least {seq_len + 5} games'}
        
        logger.info(
            f"[{self.name}] Entrenando con {n_games} partidas, "
            f"seq_len={seq_len}, device={self.device}"
        )
        
        # Dataset — split temporal (80/20)
        split_idx = int(n_games * 0.8)
        train_dataset = ChickenSequenceDataset(bone_matrix[:split_idx], seq_len, augment=True)
        val_dataset = ChickenSequenceDataset(bone_matrix[split_idx - seq_len:], seq_len, augment=False)
        
        if len(train_dataset) < 5 or len(val_dataset) < 2:
            logger.warning(f"[{self.name}] Datasets muy pequeños: train={len(train_dataset)}, val={len(val_dataset)}")
            seq_len = max(3, seq_len // 2)
            train_dataset = ChickenSequenceDataset(bone_matrix[:split_idx], seq_len)
            val_dataset = ChickenSequenceDataset(bone_matrix[split_idx - seq_len:], seq_len)
        
        train_loader = DataLoader(
            train_dataset, batch_size=LSTM_BATCH_SIZE, shuffle=True
        )
        val_loader = DataLoader(
            val_dataset, batch_size=LSTM_BATCH_SIZE, shuffle=False
        )
        
        # Red
        self.input_size = train_dataset.features.shape[1]
        self.net = ChickenLSTMNet(
            input_size=self.input_size,
            hidden_size=LSTM_HIDDEN_SIZE,
            num_layers=LSTM_NUM_LAYERS,
            dropout=LSTM_DROPOUT,
        ).to(self.device)
        
        # Pérdida: BCE con pesos para el desbalance
        bone_rate = bone_matrix.mean()
        pos_weight = torch.tensor([(1 - bone_rate) / bone_rate] * GRID_SIZE).to(self.device)
        criterion = nn.BCELoss()  # Sin pos_weight para Sigmoid output
        
        # Pérdida custom que penaliza no predecir exactamente 4 huesos
        def custom_loss(pred, target):
            bce = criterion(pred, target)
            # Regularización: la suma de probabilidades debe ser ~4
            sum_penalty = ((pred.sum(dim=1) - 4.0) ** 2).mean() * 0.1
            return bce + sum_penalty
        
        optimizer = torch.optim.AdamW(
            self.net.parameters(),
            lr=LSTM_LEARNING_RATE,
            weight_decay=1e-4,
        )
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode='min', patience=7, factor=0.5
        )
        
        # Training loop con early stopping
        best_val_loss = float('inf')
        patience_counter = 0
        train_losses = []
        val_losses = []
        
        for epoch in range(LSTM_EPOCHS):
            # Train
            self.net.train()
            epoch_loss = 0
            n_batches = 0
            for x_batch, y_batch in train_loader:
                x_batch = x_batch.to(self.device)
                y_batch = y_batch.to(self.device)
                
                optimizer.zero_grad()
                pred = self.net(x_batch)
                loss = custom_loss(pred, y_batch)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.net.parameters(), max_norm=1.0)
                optimizer.step()
                
                epoch_loss += loss.item()
                n_batches += 1
            
            train_loss = epoch_loss / max(n_batches, 1)
            train_losses.append(train_loss)
            
            # Validation
            self.net.eval()
            val_loss = 0
            n_val = 0
            with torch.no_grad():
                for x_batch, y_batch in val_loader:
                    x_batch = x_batch.to(self.device)
                    y_batch = y_batch.to(self.device)
                    pred = self.net(x_batch)
                    loss = custom_loss(pred, y_batch)
                    val_loss += loss.item()
                    n_val += 1
            
            val_loss = val_loss / max(n_val, 1)
            val_losses.append(val_loss)
            scheduler.step(val_loss)
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                # Guardar mejor modelo en memoria
                best_state = {k: v.clone() for k, v in self.net.state_dict().items()}
            else:
                patience_counter += 1
                if patience_counter >= LSTM_PATIENCE:
                    logger.info(f"[{self.name}] Early stopping en epoch {epoch}")
                    break
            
            if epoch % 10 == 0:
                logger.info(
                    f"[{self.name}] Epoch {epoch}: "
                    f"train_loss={train_loss:.4f}, val_loss={val_loss:.4f}, "
                    f"lr={optimizer.param_groups[0]['lr']:.6f}"
                )
        
        # Restaurar mejor modelo
        if best_state:
            self.net.load_state_dict(best_state)
        
        self.is_trained = True
        self.train_games_count = n_games
        self.train_history = list(zip(train_losses, val_losses))
        
        metrics = {
            'best_val_loss': best_val_loss,
            'final_train_loss': train_losses[-1] if train_losses else 0,
            'epochs_trained': len(train_losses),
            'sequence_length': seq_len,
            'train_sequences': len(train_dataset),
            'val_sequences': len(val_dataset),
        }
        self.last_metrics = metrics
        
        logger.info(
            f"[{self.name}] Entrenamiento completo: "
            f"best_val_loss={best_val_loss:.4f}, epochs={len(train_losses)}"
        )
        
        return metrics
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predice P(hueso) usando la secuencia más reciente.
        X se ignora — usa bone_matrix_cache internamente.
        """
        if not self.is_trained or self.net is None or self.bone_matrix_cache is None:
            return np.full(25, 0.16)
        
        bone_matrix = self.bone_matrix_cache
        n_games = len(bone_matrix)
        seq_len = min(SEQUENCE_LENGTH, n_games)
        
        # Crear secuencia de entrada
        dataset = ChickenSequenceDataset(bone_matrix, seq_len)
        
        # Usar la última ventana disponible
        recent = bone_matrix[-seq_len:]
        extras = dataset._compute_sequence_features(recent)[-seq_len:]
        
        # Hacerlo compatible con la red
        # Si la secuencia es más corta, pad con zeros
        if len(extras) < seq_len:
            pad = np.zeros((seq_len - len(extras), extras.shape[1]), dtype=np.float32)
            extras = np.vstack([pad, extras])
        
        x = torch.FloatTensor(extras).unsqueeze(0).to(self.device)
        
        self.net.eval()
        with torch.no_grad():
            probs = self.net(x).squeeze(0).cpu().numpy()
        
        # Normalizar a 4 huesos esperados
        s = probs.sum()
        if s > 0:
            probs = probs * (4.0 / s)
        
        return np.clip(probs, 0.01, 0.99)
    
    def update_cache(self, new_bone_vector: np.ndarray):
        """Actualiza el cache de bone_matrix con una nueva partida."""
        if self.bone_matrix_cache is not None:
            self.bone_matrix_cache = np.vstack([
                self.bone_matrix_cache, 
                new_bone_vector.reshape(1, -1)
            ])
    
    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        if self.net is not None:
            torch.save({
                'model_state': self.net.state_dict(),
                'input_size': self.input_size,
                'hidden_size': LSTM_HIDDEN_SIZE,
                'num_layers': LSTM_NUM_LAYERS,
            }, path / "lstm_model.pt")
        
        if self.bone_matrix_cache is not None:
            np.save(path / "lstm_bone_cache.npy", self.bone_matrix_cache)
        
        # Guardar historial de training
        with open(path / "lstm_history.json", 'w') as f:
            json.dump(self.train_history, f)
        
        logger.info(f"[{self.name}] Modelo guardado en {path}")
    
    def load(self, path: Path) -> bool:
        try:
            model_path = path / "lstm_model.pt"
            if not model_path.exists():
                return False
            
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=True)
            
            self.input_size = checkpoint.get('input_size', 29)
            self.net = ChickenLSTMNet(
                input_size=self.input_size,
                hidden_size=checkpoint.get('hidden_size', LSTM_HIDDEN_SIZE),
                num_layers=checkpoint.get('num_layers', LSTM_NUM_LAYERS),
            ).to(self.device)
            self.net.load_state_dict(checkpoint['model_state'])
            
            cache_path = path / "lstm_bone_cache.npy"
            if cache_path.exists():
                self.bone_matrix_cache = np.load(cache_path)
            
            history_path = path / "lstm_history.json"
            if history_path.exists():
                with open(history_path) as f:
                    self.train_history = json.load(f)
            
            self.is_trained = True
            logger.info(f"[{self.name}] Modelo cargado desde {path}")
            return True
        except Exception as e:
            logger.error(f"[{self.name}] Error cargando: {e}")
            return False
