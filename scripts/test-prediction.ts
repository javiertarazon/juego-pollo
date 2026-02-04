
async function testPrediction() {
    console.log('--- Iniciando Prueba de Motor Predictivo ---');
    try {
        const response = await fetch('http://localhost:3000/api/chicken/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                count: 5,
                boneCount: 3,
                useTrainedPatterns: true
            })
        });

        const data = await response.json();

        console.log('Status:', response.status);
        if (data.predictiveEngine) {
            console.log('\n[DEBUG CLIENTE] Datos del Motor Recibidos:');
            console.log('Activo:', data.predictiveEngine.active);
            console.log('Spots Alta Confianza:', data.predictiveEngine.highConfidenceSpots);
            console.log('Top Predicciones:', JSON.stringify(data.predictiveEngine.topPredictions, null, 2));
        } else {
            console.log('ALERTA: No se recibieron datos del motor predictivo.');
            console.log(data);
        }

    } catch (error) {
        console.error('Error conectando con API:', error);
    }
}

testPrediction();
