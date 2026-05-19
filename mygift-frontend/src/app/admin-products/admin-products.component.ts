import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ProductService } from '../_services/product.service';
import { AlertService } from '../_services/alert.service';

@Component({
  selector: 'app-admin-products',
  templateUrl: './admin-products.component.html'
})
export class AdminProductsComponent implements OnInit {
  products: any[] = [];
  editing = false;
  editingId: number | null = null;
  loading = false;

  form: any;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: [''],
      price: [0, Validators.required],
      imageUrl: [''],
      isAvailable: [true]
    });

    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products: any[]) => {
        this.products = products;
      },
      error: () => {
        this.alertService.error('Unable to load products.');
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.error('Please complete the required product fields.');
      return;
    }

    this.loading = true;

    const request = this.editing && this.editingId
      ? this.productService.update(this.editingId, this.form.value)
      : this.productService.create(this.form.value);

    request.subscribe({
      next: () => {
        this.alertService.success(this.editing ? 'Product updated successfully.' : 'Product added successfully.');
        this.cancel();
        this.loadProducts();
      },
      error: () => {
        this.alertService.error('Unable to save product.');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  edit(product: any): void {
    this.editing = true;
    this.editingId = product.id;

    this.form.patchValue({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      isAvailable: product.isAvailable
    });
  }

  cancel(): void {
    this.editing = false;
    this.editingId = null;
    this.loading = false;

    if (this.form) {
      this.form.reset({
        name: '',
        category: '',
        description: '',
        price: 0,
        imageUrl: '',
        isAvailable: true
      });
    }
  }

  deleteProduct(id: number): void {
    if (!confirm('Delete this product?')) return;

    this.productService.delete(id).subscribe({
      next: () => {
        this.alertService.success('Product deleted successfully.');
        this.loadProducts();
      },
      error: () => {
        this.alertService.error('Unable to delete product.');
      }
    });
  }
}