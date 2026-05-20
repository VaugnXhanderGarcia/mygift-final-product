import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../_services/product.service';
import { OrderService } from '../_services/order.service';

@Component({
  selector: 'app-public-order',
  templateUrl: './public-order.component.html',
  styleUrls: ['./public-order.component.css']
})
export class PublicOrderComponent implements OnInit {
  products: any[] = [];
  categories: string[] = ['All'];
  selectedCategory = 'All';

  cart: any[] = [];
  submittedOrder: any = null;
  loading = false;

  qrUrl = '';
  form!: FormGroup;

  selectedProduct: any = null;
  selectedDescription = '';
  selectedQuantity = 1;
  addYakult = false;
  selectedTemperature: 'Hot' | 'Cold' = 'Cold';

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      customerName: ['', Validators.required],
      contactNumber: ['', Validators.required],
      pickupDate: ['', Validators.required],
      pickupTime: ['', Validators.required],
      notes: ['']
    });

    this.generateQrCode();
    this.loadProducts();
  }

  generateQrCode(): void {
    const customerOrderUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:4200/'
        : 'https://mygift-frontend.onrender.com/';

    this.qrUrl =
      'https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=' +
      encodeURIComponent(customerOrderUrl);
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products: any[]) => {
        this.products = products.filter(p => p.isAvailable);

        const categorySet = new Set(this.products.map(p => p.category));
        this.categories = ['All', ...Array.from(categorySet)];
      },
      error: () => {
        alert('Failed to load products. Please make sure backend is running.');
      }
    });
  }

  displayCategory(category: string): string {
    if (category === 'Lemonade') {
      return 'Fresh Fruits';
    }

    return category;
  }

  isFreshFruitCategory(category: string): boolean {
    return category === 'Lemonade' || category === 'Fresh Fruits';
  }

  isHotColdLemonadeCategory(category: string): boolean {
    return category === 'Hot/Cold Lemonade';
  }

  get filteredProducts(): any[] {
    if (this.selectedCategory === 'All') {
      return this.products;
    }

    return this.products.filter(product => product.category === this.selectedCategory);
  }

  getProductDescription(product: any): string {
    const name = String(product.name || '').toLowerCase();

    if (name.includes('mango')) {
      return 'A sweet and refreshing mango drink made with fresh fruit flavor, perfect for a cool and fruity treat.';
    }

    if (name.includes('strawberry')) {
      return 'A fruity strawberry drink with a light sweetness and refreshing taste.';
    }

    if (name.includes('apple')) {
      return 'A crisp and refreshing apple-flavored drink with a clean fruity taste.';
    }

    if (name.includes('lemon')) {
      return 'A refreshing lemonade drink with a balanced sweet and citrus flavor.';
    }

    if (name.includes('burger')) {
      return 'A tasty food item best paired with a refreshing drink.';
    }

    if (name.includes('fries')) {
      return 'A crispy snack option that is good for sharing or pairing with drinks.';
    }

    if (this.isFreshFruitCategory(product.category)) {
      return 'A refreshing fresh fruit drink made for customers who want a sweet and fruity beverage.';
    }

    if (this.isHotColdLemonadeCategory(product.category)) {
      return 'A lemonade drink available as hot or cold, depending on your preference.';
    }

    if (product.category === 'Food') {
      return 'A food item that pairs well with our drinks.';
    }

    return 'A delicious MyGift product prepared fresh for every customer.';
  }

  openProduct(product: any): void {
    this.selectedProduct = product;
    this.selectedDescription = this.getProductDescription(product);
    this.selectedQuantity = 1;
    this.addYakult = false;
    this.selectedTemperature = 'Cold';
  }

  closeProductModal(): void {
    this.selectedProduct = null;
    this.selectedDescription = '';
    this.selectedQuantity = 1;
    this.addYakult = false;
    this.selectedTemperature = 'Cold';
  }

  increaseSelectedQuantity(): void {
    this.selectedQuantity += 1;
  }

  decreaseSelectedQuantity(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity -= 1;
    }
  }

  confirmAddToCart(): void {
    if (!this.selectedProduct) {
      return;
    }

    let finalName = this.selectedProduct.name;
    let finalPrice = Number(this.selectedProduct.price);

    if (this.isFreshFruitCategory(this.selectedProduct.category) && this.addYakult) {
      finalName += ' + Yakult';
      finalPrice += 10;
    }

    if (this.isHotColdLemonadeCategory(this.selectedProduct.category)) {
      finalName += ` (${this.selectedTemperature})`;
    }

    const existingItem = this.cart.find(item => item.productName === finalName);

    if (existingItem) {
      existingItem.quantity += this.selectedQuantity;
      existingItem.subtotal = existingItem.price * existingItem.quantity;
    } else {
      this.cart.push({
        productId: this.selectedProduct.id,
        productName: finalName,
        price: finalPrice,
        quantity: this.selectedQuantity,
        subtotal: finalPrice * this.selectedQuantity
      });
    }

    this.closeProductModal();
  }

  add(product: any): void {
    this.openProduct(product);
  }

  decrease(item: any): void {
    item.quantity -= 1;

    if (item.quantity <= 0) {
      this.cart = this.cart.filter(cartItem => cartItem.productName !== item.productName);
    } else {
      item.subtotal = item.price * item.quantity;
    }
  }

  total(): number {
    return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  submit(): void {
    this.submittedOrder = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please complete customer name, contact number, pickup date, and pickup time.');
      return;
    }

    if (this.cart.length === 0) {
      alert('Please select at least one product.');
      return;
    }

    const payload = {
      customerName: this.form.value.customerName,
      contactNumber: this.form.value.contactNumber,
      pickupDate: this.form.value.pickupDate,
      pickupTime: this.form.value.pickupTime,
      notes: this.form.value.notes || '',
      items: this.cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }))
    };

    this.loading = true;

    this.orderService.createPublic(payload).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.submittedOrder = response;

        alert(`Reservation submitted successfully. Reference #: ${response.id}`);

        this.form.reset();
        this.cart = [];
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Order submit error:', error);

        alert(
          error?.error?.message ||
          'Order failed. Please make sure the backend is running.'
        );
      }
    });
  }
}