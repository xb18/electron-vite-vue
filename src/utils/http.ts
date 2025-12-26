import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// 创建 axios 实例并重写类型，使其返回 any 而不是 AxiosResponse
type AxiosInstanceAny = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch'> & {
	get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
	post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
	put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
	delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
	patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
};

const axiosInstance = axios.create() as AxiosInstanceAny;

declare module 'axios' {
	interface AxiosRequestConfig {
		rejectError?: boolean;
	}
}

axiosInstance.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const { data } = config;
		const token = localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		// 如果数据是 FormData 类型，则添加 Content-Type 头
		if (data instanceof FormData) {
			config.headers['Content-Type'] = 'multipart/form-data';
		}
		if (config.timeout === undefined) {
			config.timeout = 10000;
		}

		// 如果路径以 /pyapi 开头，转发到 http://localhost:8001
		if (config.url?.startsWith('/pyapi')) {
			// 移除 /pyapi 前缀，因为后端可能不需要这个前缀
			config.url = config.url.replace('/pyapi', '');
			// 设置 baseURL 为 Python 后端
			config.baseURL = 'http://localhost:8001';
		}

		return config;
	},
	(error: AxiosError) => {
		const config = error.config;
		const errorRes = {
			error: error,
		};
		if (config && config.rejectError) {
			return Promise.reject(errorRes);
		}
		return errorRes;
	}
);

axiosInstance.interceptors.response.use(
	(response: AxiosResponse) => {
		const resData = response.data;
		return resData;
	},
	(error: AxiosError) => {
		const config = error.config;
		// 兼容401且返回data里error的情况
		const responseData = (error.response?.data || {}) as any;
		const dataError = responseData.error;
		const errorRes = {
			error: dataError || error,
		};
		if (config && config.rejectError) {
			return Promise.reject(errorRes);
		}
		return errorRes;
	}
);

export const httpPost = axiosInstance.post;
export const httpGet = axiosInstance.get;
export const httpPut = axiosInstance.put;

export default axiosInstance;
