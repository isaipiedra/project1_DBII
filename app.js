import express, { json } from 'express';

const app = express();
const port = 3000;

app.use(json());
app.use(express.static('public'));

async function startServer() {
  try {
    app.listen(port, () => {
      console.log(`App running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();