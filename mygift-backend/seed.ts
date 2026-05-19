import bcrypt from 'bcryptjs';
import { db } from './_helpers/db';

export async function seedDefaultData() {
  // 1. Create default admin if no admin exists
  const adminCount = await db.Admin.count();

  if (adminCount === 0) {
    await db.Admin.create({
      email: 'admin@mygift.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      firstName: 'MyGift',
      lastName: 'Admin',
      role: 'Admin'
    });

    console.log('Default admin account created.');
  }

  // 2. Reset menu/products safely
  await db.OrderItem.destroy({ where: {} });
  await db.Order.destroy({ where: {} });
  await db.Product.destroy({ where: {} });

  // 3. Insert MyGift Lemonade and Snack Bar menu
  await db.Product.bulkCreate([
    {
      name: 'Strawberry Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh strawberry lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/strawberry-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Blueberry Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh blueberry lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/blueberry-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Carrots Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh carrots lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/carrots-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Melon Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh melon lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/melon-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Watermelon Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh watermelon lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/watermelon-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Cucumber Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh cucumber lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/cucumber-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Chia Seeds Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh chia seeds lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/chia-seeds-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Kiwi Lemonade',
      category: 'Lemonade',
      price: 95,
      description: 'Fresh kiwi lemonade. Add Yakult for ₱105.',
      imageUrl: '/assets/menu/kiwi-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Mixed Berries Lemonade',
      category: 'Lemonade',
      price: 115,
      description: 'Mixed berries lemonade. Add Yakult for ₱125.',
      imageUrl: '/assets/menu/mixed-berries-lemonade.png',
      isAvailable: true
    },
    {
      name: 'Mix and Match Lemonade',
      category: 'Lemonade',
      price: 115,
      description: 'Choose 2 flavors of your choice. Add Yakult for ₱125.',
      imageUrl: '/assets/menu/mix-and-match-lemonade.png',
      isAvailable: true
    },

    {
      name: 'Lemonade with Ginger',
      category: 'Hot/Cold Lemonade',
      price: 95,
      description: 'Lemonade with ginger. Available hot or cold.',
      imageUrl: '/assets/menu/lemonade-ginger.png',
      isAvailable: true
    },
    {
      name: 'Lemonade with Oregano',
      category: 'Hot/Cold Lemonade',
      price: 95,
      description: 'Lemonade with oregano. Available hot or cold.',
      imageUrl: '/assets/menu/lemonade-oregano.png',
      isAvailable: true
    },
    {
      name: 'Lemonade with Mint',
      category: 'Hot/Cold Lemonade',
      price: 95,
      description: 'Lemonade with mint. Available hot or cold.',
      imageUrl: '/assets/menu/lemonade-mint.png',
      isAvailable: true
    },
    {
      name: 'Cucumber with Ginger',
      category: 'Hot/Cold Lemonade',
      price: 115,
      description: 'Cucumber lemonade with ginger. Available hot or cold.',
      imageUrl: '/assets/menu/cucumber-ginger.png',
      isAvailable: true
    },
    {
      name: 'Cucumber with Oregano',
      category: 'Hot/Cold Lemonade',
      price: 115,
      description: 'Cucumber lemonade with oregano. Available hot or cold.',
      imageUrl: '/assets/menu/cucumber-oregano.png',
      isAvailable: true
    },
    {
      name: 'Cucumber with Mint',
      category: 'Hot/Cold Lemonade',
      price: 115,
      description: 'Cucumber lemonade with mint. Available hot or cold.',
      imageUrl: '/assets/menu/cucumber-mint.png',
      isAvailable: true
    },
    {
      name: 'Ginger with Oregano',
      category: 'Hot/Cold Lemonade',
      price: 115,
      description: 'Ginger and oregano drink. Available hot or cold.',
      imageUrl: '/assets/menu/ginger-oregano.png',
      isAvailable: true
    },
    {
      name: 'Ginger with Mint',
      category: 'Hot/Cold Lemonade',
      price: 115,
      description: 'Ginger and mint drink. Available hot or cold.',
      imageUrl: '/assets/menu/ginger-mint.png',
      isAvailable: true
    },
    {
      name: 'Oregano with Mint',
      category: 'Hot/Cold Lemonade',
      price: 115,
      description: 'Oregano and mint drink. Available hot or cold.',
      imageUrl: '/assets/menu/oregano-mint.png',
      isAvailable: true
    },

    {
      name: 'Creamy Carbonara',
      category: 'Food',
      price: 100,
      description: 'Creamy carbonara pasta.',
      imageUrl: '/assets/menu/creamy-carbonara.png',
      isAvailable: true
    },
    {
      name: 'Penne Pesto',
      category: 'Food',
      price: 100,
      description: 'Penne pasta with pesto sauce.',
      imageUrl: '/assets/menu/penne-pesto.png',
      isAvailable: true
    },
    {
      name: 'Tteokbokki',
      category: 'Food',
      price: 90,
      description: 'Korean-style spicy rice cake snack.',
      imageUrl: '/assets/menu/tteokbokki.png',
      isAvailable: true
    },
    {
      name: 'Lasagna',
      category: 'Food',
      price: 150,
      description: 'Baked lasagna with rich sauce.',
      imageUrl: '/assets/menu/lasagna.png',
      isAvailable: true
    },
    {
      name: 'Mac and Cheese',
      category: 'Food',
      price: 90,
      description: 'Creamy macaroni and cheese.',
      imageUrl: '/assets/menu/mac-and-cheese.png',
      isAvailable: true
    },
    {
      name: 'Green Salad',
      category: 'Food',
      price: 100,
      description: 'Fresh green salad.',
      imageUrl: '/assets/menu/green-salad.png',
      isAvailable: true
    },
    {
      name: 'Overnight Oats',
      category: 'Food',
      price: 100,
      description: 'Healthy overnight oats in a jar.',
      imageUrl: '/assets/menu/overnight-oats.png',
      isAvailable: true
    },
    {
      name: 'Herb Crust Pizza - 1 Box',
      category: 'Food',
      price: 220,
      description: 'Herb crust pizza, 1 box.',
      imageUrl: '/assets/menu/pizza-one-box.png',
      isAvailable: true
    },
    {
      name: 'Herb Crust Pizza - 2 Boxes',
      category: 'Food',
      price: 420,
      description: 'Herb crust pizza, 2 boxes only.',
      imageUrl: '/assets/menu/herb-crust-pizza-two-boxes.png',
      isAvailable: true
    }
  ]);

  console.log('MyGift menu products seeded successfully.');
}