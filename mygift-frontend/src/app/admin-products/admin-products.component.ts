import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../_services/product.service';
import { AlertService } from '../_services/alert.service';

@Component({
  templateUrl: './admin-products.component.html'
})
export class AdminProductsComponent implements OnInit {
  products: any[] = [];
  editing: any = null;
  loading = false;
  saving = false;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private alertService: AlertService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: [''],
      price: [0, Validators.required],
      imageUrl: [''],
      isAvailable: [true, Validators.required]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;

    this.productService.getAll().subscribe({
      next: products => {
        this.products = products || [];
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  edit(product: any): void {
    this.editing = product;

    this.form.patchValue({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: Number(product.price),
      imageUrl: product.imageUrl || '',
      isAvailable: product.isAvailable === true || product.isAvailable === 1
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancel(): void {
    this.editing = null;

    this.form.reset({
      name: '',
      category: '',
      description: '',
      price: 0,
      imageUrl: '',
      isAvailable: true
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.error('Please complete the product name, category, and price.');
      return;
    }

    const productPayload = {
      name: this.form.value.name,
      category: this.form.value.category,
      description: this.form.value.description || '',
      price: Number(this.form.value.price),
      imageUrl: this.form.value.imageUrl || '',
      isAvailable: this.form.value.isAvailable === true
    };

    this.saving = true;

    const request = this.editing
      ? this.productService.update(this.editing.id, productPayload)
      : this.productService.create(productPayload);

    request.subscribe({
      next: () => {
        this.saving = false;

        this.alertService.success(
          this.editing ? 'Product updated successfully.' : 'Product added successfully.'
        );

        this.cancel();
        this.load();
      },
      error: error => {
        this.saving = false;
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  setAvailability(product: any, isAvailable: boolean): void {
    this.productService.updateAvailability(product.id, isAvailable).subscribe({
      next: response => {
        const updatedProduct = response.product || {
          ...product,
          isAvailable
        };

        this.products = this.products.map(existingProduct =>
          existingProduct.id === product.id ? updatedProduct : existingProduct
        );

        this.alertService.success(
          isAvailable
            ? `${product.name} is now available.`
            : `${product.name} is now unavailable.`
        );
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  delete(product: any): void {
    if (!confirm(`Delete ${product.name}?`)) {
      return;
    }

    this.productService.delete(product.id).subscribe({
      next: () => {
        this.alertService.success('Product deleted successfully.');
        this.load();
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  getAvailabilityText(product: any): string {
    return product.isAvailable === true || product.isAvailable === 1 ? 'Yes' : 'No';
  }

  getAvailabilityBadge(product: any): string {
    return product.isAvailable === true || product.isAvailable === 1
      ? 'bg-success'
      : 'bg-danger';
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    return (
      error?.error?.message ||
      error?.message ||
      'Something went wrong. Please try again.'
    );
  }
}