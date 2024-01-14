import express from 'express';
import bodyParser from 'body-parser';
import userRoutes from './api/middleware/user-api';

const app = express();
const PORT = 8000;

app.use(bodyParser.json());

// Use user routes
app.use('/user', userRoutes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
