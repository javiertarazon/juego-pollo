-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChickenGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boneCount" INTEGER NOT NULL,
    "revealedCount" INTEGER NOT NULL DEFAULT 0,
    "hitBone" BOOLEAN NOT NULL DEFAULT false,
    "cashOutPosition" INTEGER,
    "multiplier" REAL,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streakStateId" TEXT,
    "objetivo" INTEGER,
    "modoJuego" TEXT
);

-- CreateTable
CREATE TABLE "ChickenPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isChicken" BOOLEAN NOT NULL,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "revealOrder" INTEGER,
    CONSTRAINT "ChickenPosition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "ChickenGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChickenPositionStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position" INTEGER NOT NULL,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "chickenCount" INTEGER NOT NULL DEFAULT 0,
    "boneCount" INTEGER NOT NULL DEFAULT 0,
    "winRate" REAL NOT NULL DEFAULT 0.0,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ChickenPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "boneCount" INTEGER NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "nextChicken" TEXT,
    "nextBone" TEXT,
    "successRate" REAL NOT NULL DEFAULT 0.0,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SimulationStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetPositions" INTEGER NOT NULL,
    "boneCount" INTEGER NOT NULL,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "victories" INTEGER NOT NULL DEFAULT 0,
    "defeats" INTEGER NOT NULL DEFAULT 0,
    "winRate" REAL NOT NULL DEFAULT 0.0,
    "avgRevealedCount" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StreakState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL DEFAULT 'default',
    "rachaActual" INTEGER NOT NULL DEFAULT 0,
    "modoActivo" TEXT NOT NULL DEFAULT 'conservador',
    "objetivoActual" INTEGER NOT NULL,
    "partidaActualId" TEXT,
    "posicionesConfirmadas" INTEGER NOT NULL DEFAULT 0,
    "ultimaActualizacion" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnalysisReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partidasAnalizadas" INTEGER NOT NULL,
    "tasaAcierto" REAL NOT NULL,
    "tasaExito" REAL NOT NULL,
    "promedioRetiro" REAL NOT NULL,
    "mejorRacha" INTEGER NOT NULL,
    "patrones" TEXT NOT NULL,
    "recomendaciones" TEXT NOT NULL,
    "comparacionData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RealBonePositions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "posiciones" TEXT NOT NULL,
    "reportadoPor" TEXT NOT NULL DEFAULT 'usuario',
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RealBonePositions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "ChickenGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ChickenPosition_gameId_position_key" ON "ChickenPosition"("gameId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChickenPositionStats_position_isSimulated_key" ON "ChickenPositionStats"("position", "isSimulated");

-- CreateIndex
CREATE UNIQUE INDEX "ChickenPattern_pattern_boneCount_key" ON "ChickenPattern"("pattern", "boneCount");

-- CreateIndex
CREATE INDEX "SimulationStats_targetPositions_idx" ON "SimulationStats"("targetPositions");

-- CreateIndex
CREATE INDEX "SimulationStats_boneCount_idx" ON "SimulationStats"("boneCount");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationStats_targetPositions_boneCount_key" ON "SimulationStats"("targetPositions", "boneCount");

-- CreateIndex
CREATE INDEX "StreakState_usuarioId_idx" ON "StreakState"("usuarioId");

-- CreateIndex
CREATE INDEX "AnalysisReport_timestamp_idx" ON "AnalysisReport"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "RealBonePositions_gameId_key" ON "RealBonePositions"("gameId");

-- CreateIndex
CREATE INDEX "RealBonePositions_gameId_idx" ON "RealBonePositions"("gameId");
