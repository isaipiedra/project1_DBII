const cassandra = require('cassandra-driver');
const assert = require('assert'); // Faltaba importar assert

// Configuración del cliente Cassandra
const client = new cassandra.Client({
    contactPoints: ['127.0.0.1'], 
    localDataCenter: 'datacenter1',
    keyspace: 'dataset_message_management'
});

client.connect(function(err) {
    if (err) {
        console.error('Error conectando a Cassandra:', err);
        return;
    }
    console.log('Conectado a Cassandra exitosamente');
});

const query = 'SELECT * FROM COMMENT_DS';

client.execute(query).then(result => {
        if (result.rows && result.rows.length > 0) {
            result.rows.forEach((row, index) => {
                console.log(`Fila ${index + 1}:`, {
                    id_dataset: row.id_dataset,
                    id_comment: row.id_comment,
                    user_name: row.user_name,
                    comment: row.reply,
                    visible: row.visible
                });
            });
        } else {
            console.log('No se encontraron datos en la tabla');
        }
    })
    .catch(err => {
        console.error('Error ejecutando query:', err);
    })
    .finally(() => {
        client.shutdown();
    });