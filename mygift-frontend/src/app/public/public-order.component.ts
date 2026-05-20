import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../_services/product.service';
import { OrderService } from '../_services/order.service';

@Component({
  selector: 'app-public-order',
  templateUrl: './public-order.component.html',
  styleUrls: ['./public-order.component.css']
})
export class PublicOrderComponent implements OnInit, OnDestroy {
  products: any[] = [];
  categories: string[] = ['All'];
  selectedCategory = 'All';

  cart: any[] = [];
  submittedOrder: any = null;
  receiptOrder: any = null;

  loading = false;
  qrUrl = '';

  screen: 'order' | 'review' | 'receipt' = 'order';
  countdown = 10;
  receiptTimer: any = null;

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

  ngOnDestroy(): void {
    this.clearReceiptTimer();
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

  increaseCartItem(item: any): void {
    item.quantity += 1;
    item.subtotal = item.price * item.quantity;
  }

  removeCartItem(item: any): void {
    this.cart = this.cart.filter(cartItem => cartItem.productName !== item.productName);
  }

  total(): number {
    return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  buildOrderPayload(): any {
    return {
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
  }

  submit(): void {
    this.reviewOrder();
  }

  reviewOrder(): void {
    this.submittedOrder = null;
    this.receiptOrder = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please complete customer name, contact number, pickup date, and pickup time.');
      return;
    }

    if (this.cart.length === 0) {
      alert('Please select at least one product.');
      return;
    }

    this.screen = 'review';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToOrder(): void {
    this.screen = 'order';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  finishOrder(): void {
    if (this.form.invalid || this.cart.length === 0) {
      this.backToOrder();
      return;
    }

    const payload = this.buildOrderPayload();

    this.loading = true;

    this.orderService.createPublic(payload).subscribe({
      next: (response: any) => {
        this.loading = false;

        const savedOrder = response.order || response;

this.receiptOrder = {
  ...payload,
  ...savedOrder,
  id: savedOrder.id,
  orderCode: savedOrder.orderCode,
  items: payload.items,
  createdAt: new Date()
};

        this.screen = 'receipt';
        this.startReceiptCountdown();

        window.scrollTo({ top: 0, behavior: 'smooth' });
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

  startReceiptCountdown(): void {
    this.clearReceiptTimer();
    this.countdown = 10;

    this.receiptTimer = setInterval(() => {
      this.countdown -= 1;

      if (this.countdown <= 0) {
        this.startNewOrder();
      }
    }, 1000);
  }

  clearReceiptTimer(): void {
    if (this.receiptTimer) {
      clearInterval(this.receiptTimer);
      this.receiptTimer = null;
    }
  }

  startNewOrder(): void {
    this.clearReceiptTimer();

    this.form.reset();
    this.cart = [];
    this.submittedOrder = null;
    this.receiptOrder = null;
    this.selectedCategory = 'All';
    this.loading = false;
    this.screen = 'order';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  skipReceiptTimer(): void {
    this.startNewOrder();
  }

  getReceiptDate(): string {
    return new Date().toLocaleString();
  }
}