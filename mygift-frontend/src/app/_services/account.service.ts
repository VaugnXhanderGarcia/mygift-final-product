import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private accountSubject: BehaviorSubject<any>;
  public account: Observable<any>;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.accountSubject = new BehaviorSubject<any>(
      JSON.parse(localStorage.getItem('account') || 'null')
    );

    this.account = this.accountSubject.asObservable();
  }

  get accountValue() {
    return this.accountSubject.value;
  }

  get adminValue() {
    return this.accountSubject.value;
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(map(account => {
        localStorage.setItem('account', JSON.stringify(account));
        this.accountSubject.next(account);
        return account;
      }));
  }

  logout() {
    localStorage.removeItem('account');
    this.accountSubject.next(null);
    this.router.navigate(['/admin/login']);
  }

    updateProfile(currentPassword: string, newPassword: string) {
    return this.http.put<any>(`${environment.apiUrl}/auth/profile`, {
      currentPassword,
      newPassword
    }).pipe(map(account => {
      if (account) {
        const updatedAccount = {
          ...this.accountValue,
          ...account
        };

        localStorage.setItem('account', JSON.stringify(updatedAccount));
        this.accountSubject.next(updatedAccount);
      }

      return account;
    }));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<any>(`${environment.apiUrl}/auth/profile`, {
      currentPassword,
      newPassword
    });
  }
}