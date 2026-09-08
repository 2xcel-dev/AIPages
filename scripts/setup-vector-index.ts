import { MongoClient } from 'mongodb';
import { config } from '../src/config';

async function setupVectorIndex() {
  if (!config.MONGODB_URI) {
    console.log('No MONGODB_URI provided — skipping index creation.');
    return;
  }

  const client = new MongoClient(config.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('tools');

    const indexName = config.VECTOR_INDEX_NAME || 'vector_index';
    console.log(`Creating vectorSearch index "${indexName}" on "tools" collection…`);

    await collection.createSearchIndex({
      name: indexName,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: config.embeddingDimensions,
            similarity: 'cosine',
          },
        ],
      },
    });

    console.log('Vector search index created successfully.');
  } catch (error) {
    console.error('Error creating vector search index:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

setupVectorIndex();
