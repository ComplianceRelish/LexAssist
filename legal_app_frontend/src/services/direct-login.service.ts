/**
 * Direct Login Service
 * 
 * This service provides a direct login method that bypasses email verification
 * requirements from Supabase Auth. It works by using the Supabase admin API
 * to generate tokens directly.
 */

import axios from 'axios';
import { User } from '../types';

interface DirectLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

class DirectLoginService {
  private static instance: DirectLoginService;
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  public static getInstance(): DirectLoginService {
    if (!DirectLoginService.instance) {
      DirectLoginService.instance = new DirectLoginService();
    }
    return DirectLoginService.instance;
  }
  
  /**
   * Performs a direct login that bypasses email verification
   * This uses a special backend endpoint that generates tokens directly
   */
  public async directLogin(email: string, password: string): Promise<DirectLoginResponse> {
    try {
      console.log('Attempting direct login for:', email);
      
      const response = await axios.post<DirectLoginResponse>('/api/auth/direct-login', {
        email,
        password
      });
      
      console.log('Direct login successful');
      return response.data;
    } catch (error: any) {
      console.error('Direct login failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Direct login failed');
    }
  }
}

export const directLoginService = DirectLoginService.getInstance();
