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
  selectedCategory = 'All';

  cart: any[] = [];
  form!: FormGroup;

  loading = false;
  reviewMode = false;

  selectedProduct: any = null;
  selectedDescription = '';
  selectedQuantity = 1;
  addYakult = false;
  selectedTemperature = 'Cold';

  receiptOrder: any = null;
  receiptItems: any[] = [];
  receiptCountdown = 10;
  private receiptTimer: any = null;

  qrUrl = '';

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

    const orderingUrl = window.location.origin + '/';
    this.qrUrl =
      'https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=' +
      encodeURIComponent(orderingUrl);

    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.clearReceiptTimer();
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products: any[]) => {
        this.products = products || [];
      },
      error: () => {
        alert('Failed to load products. Please make sure backend is running.');
      }
    });
  }

  get categories(): string[] {
    const categorySet = new Set(this.products.map(product => product.category));
    return ['All', ...Array.from(categorySet)];
  }

  get filteredProducts(): any[] {
    if (this.selectedCategory === 'All') {
      return this.products;
    }

    return this.products.filter(product => product.category === this.selectedCategory);
  }

  displayCategory(category: string): string {
    if (!category) {
      return '';
    }

    const value = category.toLowerCase().trim();

    if (value === 'lemonade') {
      return 'Fresh Fruits';
    }

    return category;
  }

  getProductDescription(product: any): string {
    const name = String(product?.name || '').toLowerCase();

    if (product?.description) {
      return product.description;
    }

    if (name.includes('watermelon')) {
      return 'A refreshing fruit drink made for a sweet and cool taste.';
    }

    if (name.includes('blueberry')) {
      return 'A sweet and fruity drink with a smooth berry flavor.';
    }

    if (name.includes('carrot')) {
      return 'A fresh fruit drink with a light, healthy, and refreshing taste.';
    }

    if (name.includes('lemon')) {
      return 'A classic lemonade drink with a refreshing citrus flavor.';
    }

    if (name.includes('food') || name.includes('snack')) {
      return 'A tasty snack that pairs well with your selected drink.';
    }

    return 'A fresh and affordable MyGift product made for quick pickup orders.';
  }

  isFreshFruitCategory(category: string): boolean {
    const value = String(category || '').toLowerCase().trim();

    return value === 'lemonade' || value.includes('fresh fruit');
  }

  isHotColdLemonadeCategory(category: string): boolean {
    const value = String(category || '').toLowerCase().trim();

    return value.includes('hot') || value.includes('cold');
  }

  openProduct(product: any): void {
    if (product?.isAvailable === false) {
      alert('This product is currently not available.');
      return;
    }

    this.selectedProduct = product;
    this.selectedDescription = this.getProductDescription(product);
    this.selectedQuantity = 1;
    this.addYakult = false;
    this.selectedTemperature = 'Cold';
  }

  closeProductModal(): void {
    this.selectedProduct = null;
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

    let productName = this.selectedProduct.name;
    let price = Number(this.selectedProduct.price);

    if (this.isFreshFruitCategory(this.selectedProduct.category) && this.addYakult) {
      productName += ' + Yakult';
      price += 10;
    }

    if (this.isHotColdLemonadeCategory(this.selectedProduct.category)) {
      productName += ` (${this.selectedTemperature})`;
    }

    this.addToCart({
      productId: this.selectedProduct.id,
      productName,
      price,
      quantity: this.selectedQuantity
    });

    this.closeProductModal();
  }

  add(product: any): void {
    if (product?.isAvailable === false) {
      alert('This product is currently not available.');
      return;
    }

    this.addToCart({
      productId: product.id,
      productName: product.name,
      price: Number(product.price),
      quantity: 1
    });
  }

  addToCart(newItem: any): void {
    const existingItem = this.cart.find(
      item =>
        item.productId === newItem.productId &&
        item.productName === newItem.productName &&
        Number(item.price) === Number(newItem.price)
    );

    if (existingItem) {
      existingItem.quantity += Number(newItem.quantity);
      existingItem.subtotal = existingItem.price * existingItem.quantity;
    } else {
      this.cart.push({
        productId: newItem.productId,
        productName: newItem.productName,
        price: Number(newItem.price),
        quantity: Number(newItem.quantity),
        subtotal: Number(newItem.price) * Number(newItem.quantity)
      });
    }
  }

  increaseCartItem(item: any): void {
    item.quantity += 1;
    item.subtotal = item.price * item.quantity;
  }

  decrease(item: any): void {
    item.quantity -= 1;

    if (item.quantity <= 0) {
      this.remove(item);
    } else {
      item.subtotal = item.price * item.quantity;
    }
  }

  remove(item: any): void {
    this.cart = this.cart.filter(cartItem => cartItem !== item);
  }

  total(): number {
    return this.cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }

  reviewOrder(): void {
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

    this.reviewMode = true;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  editOrder(): void {
    this.reviewMode = false;
  }

  confirmOrder(): void {
    if (this.loading) {
      return;
    }

    const currentForm = this.form.getRawValue();
    const currentItems = this.cart.map(item => ({ ...item }));
    const currentTotal = this.total();

    const payload = {
      customerName: currentForm.customerName,
      contactNumber: currentForm.contactNumber,
      pickupDate: currentForm.pickupDate,
      pickupTime: currentForm.pickupTime,
      notes: currentForm.notes || '',
      totalAmount: currentTotal,
      items: currentItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }))
    };

    this.loading = true;

    this.orderService.createPublic(payload).subscribe({
      next: (response: any) => {
        const order = response?.order || response;

        this.receiptOrder = {
          ...order,
          id: response?.id || order?.id,
          orderCode: response?.orderCode || order?.orderCode || response?.id || order?.id,
          customerName: currentForm.customerName,
          contactNumber: currentForm.contactNumber,
          pickupDate: currentForm.pickupDate,
          pickupTime: currentForm.pickupTime,
          notes: currentForm.notes || '',
          totalAmount: currentTotal,
          paymentMethod: order?.paymentMethod || 'Pay at Counter',
          paymentStatus: order?.paymentStatus || 'Unpaid',
          status: order?.status || 'Pending'
        };

        this.receiptItems = currentItems;
        this.reviewMode = false;
        this.loading = false;

        this.form.reset();
        this.cart = [];

        this.startReceiptCountdown();
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
    this.receiptCountdown = 10;

    this.receiptTimer = setInterval(() => {
      this.receiptCountdown -= 1;

      if (this.receiptCountdown <= 0) {
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
    this.receiptOrder = null;
    this.receiptItems = [];
    this.receiptCountdown = 10;
    this.reviewMode = false;
    this.loading = false;
  }
}