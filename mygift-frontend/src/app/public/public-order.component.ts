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

  get filteredProducts(): any[] {
    if (this.selectedCategory === 'All') {
      return this.products;
    }

    return this.products.filter(product => product.category === this.selectedCategory);
  }

  add(product: any): void {
    const existingItem = this.cart.find(item => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.subtotal = existingItem.price * existingItem.quantity;
    } else {
      this.cart.push({
        productId: product.id,
        productName: product.name,
        price: Number(product.price),
        quantity: 1,
        subtotal: Number(product.price)
      });
    }
  }

  decrease(item: any): void {
    item.quantity -= 1;

    if (item.quantity <= 0) {
      this.cart = this.cart.filter(cartItem => cartItem.productId !== item.productId);
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