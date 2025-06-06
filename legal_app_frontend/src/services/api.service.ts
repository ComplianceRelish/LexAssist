import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { authService } from './auth.service';

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = authService.getAccessToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        // Define the extended type that includes _retry property
        interface ExtendedInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
          _retry?: boolean;
        }
        
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);
        
        // Cast to extended type first
        const extendedRequest = originalRequest as ExtendedInternalAxiosRequestConfig;
        
        if (error.response?.status === 401 && !extendedRequest._retry) {
          if (this.isRefreshing) {
            return new Promise(resolve => {
              this.refreshSubscribers.push((token: string) => {
                if (extendedRequest.headers) {
                  extendedRequest.headers.Authorization = 'Bearer ' + token;
                }
                resolve(this.axiosInstance(extendedRequest));
              });
            });
          }

          extendedRequest._retry = true;
          this.isRefreshing = true;

          try {
            await authService.refreshToken();
            const token = authService.getAccessToken();
            
            if (token) {
              this.onRefreshSuccess(token);
              if (extendedRequest.headers) {
                extendedRequest.headers.Authorization = 'Bearer ' + token;
              }
              return this.axiosInstance(extendedRequest);
            }
            
            throw new Error('No token after refresh');
          } catch (refreshError) {
            this.onRefreshFailure(refreshError as Error);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private onRefreshSuccess(token: string): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  private onRefreshFailure(error: Error): void {
    this.refreshSubscribers = [];
    authService.logout();
  }

  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

export const apiService = ApiService.getInstance();
