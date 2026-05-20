import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Router } from '@angular/router';
import { API_URL } from '../_helpers/api-url';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private adminSubject: BehaviorSubject<any | null>;

  public admin: Observable<any | null>;
  public account: Observable<any | null>;

  constructor(private http: HttpClient, private router: Router) {
    this.adminSubject = new BehaviorSubject<any | null>(
      JSON.parse(localStorage.getItem('mygiftAdmin') || 'null')
    );

    this.admin = this.adminSubject.asObservable();

    // Compatibility with old files that still use account/accountValue
    this.account = this.admin;
  }

  public get adminValue() {
    return this.adminSubject.value;
  }

  // Compatibility with app.component.ts and old guards/components
  public get accountValue() {
    return this.adminSubject.value;
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${API_URL}/auth/login`, { email, password }).pipe(
      map(admin => {
        localStorage.setItem('mygiftAdmin', JSON.stringify(admin));
        this.adminSubject.next(admin);
        return admin;
      })
    );
  }

  logout() {
    localStorage.removeItem('mygiftAdmin');
    this.adminSubject.next(null);
    this.router.navigate(['/admin/login']);
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<any>(`${API_URL}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }
}