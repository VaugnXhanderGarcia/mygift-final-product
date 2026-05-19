import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initialize } from './_helpers/db';
import errorHandler from './_middleware/error-handler';
import authController from './auth/auth.controller';
import productController from './products/products.controller';
import orderController from './orders/orders.controller';
import { seedDefaultData } from './seed';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map(x => x.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.options(/.*/, cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', (req, res) => res.json({ message: 'MyGift API is running' }));
app.use('/auth', authController);
app.use('/products', productController);
app.use('/orders', orderController);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
initialize().then(async () => {
  await seedDefaultData();
  app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
}).catch(err => {
  console.error('Database connection failed:');
  console.error(err);
  process.exit(1);
});
