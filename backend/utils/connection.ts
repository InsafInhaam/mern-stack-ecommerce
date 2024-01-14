import { createPool, Pool } from 'mysql';

const pool: Pool = createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mern-stack-ecommerce',
});

export default pool;
