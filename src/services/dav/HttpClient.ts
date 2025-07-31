import { DAVProvider } from "../../types/providers";
import { AuthConfig } from "../../types/auth";
import { DAVRequest, DAVResponse } from "../../types/dav";

export class HttpClient {
  private provider: DAVProvider | null = null;
  private authConfig: AuthConfig | null = null;

  public setAuthConfig(authConfig: AuthConfig): void {
    this.authConfig = authConfig;
  }

  public setProvider(provider: DAVProvider): void {
    this.provider = provider;
  }

  public getProvider(): DAVProvider | null {
    return this.provider;
  }

  public getAuthConfig(): AuthConfig | null {
    return this.authConfig;
  }

  private handleError(response: Response): Error {
    const status = response.status;

    switch (status) {
      case 401:
        return new Error(
          "Authentication failed. Please check your credentials."
        );
      case 403:
        return new Error(
          "Access forbidden. You may not have permission to access this resource."
        );
      case 404:
        return new Error("Resource not found. Please check the server URL.");
      case 500:
        return new Error("Server error. Please try again later.");
      default:
        return new Error(`Server error (${status}): ${response.statusText}`);
    }
  }

  /**
   * Convert absolute URLs to relative URLs for proxy in development
   */
  private convertToProxyUrl(url: string): string {
    // In development, use proxy by converting to relative URL
    if (process.env.NODE_ENV === "development") {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
      } catch (error) {
        // If URL parsing fails, return as-is
        return url;
      }
    }
    return url;
  }

  public async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<DAVResponse> {
    try {
      // Convert URL for proxy in development
      const requestUrl = this.convertToProxyUrl(url);

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/xml; charset=utf-8",
        "User-Agent": "Clowd-DAV/1.0",
        Prefer: "return-minimal",
        ...(options.headers as Record<string, string>),
      };

      // Add authentication if available
      if (this.authConfig) {
        const credentials = btoa(
          `${this.authConfig.username}:${this.authConfig.password}`
        );
        headers["Authorization"] = `Basic ${credentials}`;
      }

      // Allow provider to customize the request
      if (this.provider?.customizeRequest) {
        const davRequest: DAVRequest = {
          method: options.method?.toString() || "GET",
          url,
          headers,
          data: options.body as string,
        };

        const customizedRequest = this.provider.customizeRequest(davRequest);
        Object.assign(headers, customizedRequest.headers);
        options.body = customizedRequest.data;
      }

      const response = await fetch(requestUrl, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw this.handleError(response);
      }

      const data = await response.text();

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      // Re-throw errors that are already properly formatted
      if (
        error instanceof Error &&
        (error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error"))
      ) {
        throw error;
      }
      // Handle network errors and other unexpected errors
      throw new Error(
        "Network error. Please check your connection and server URL."
      );
    }
  }

  // Basic HTTP methods with DAV headers
  public async get(
    url: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "GET",
      headers,
    });
  }

  public async put(
    url: string,
    data: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "PUT",
      body: data,
      headers,
    });
  }

  public async post(
    url: string,
    data: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "POST",
      body: data,
      headers,
    });
  }

  public async delete(
    url: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "DELETE",
      headers,
    });
  }

  // PROPFIND method for DAV discovery
  public async propfind(
    url: string,
    data: string,
    depth: string = "1",
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    const davHeaders = {
      Depth: depth,
      "Content-Type": "application/xml; charset=utf-8",
      ...headers,
    };

    return this.makeRequest(url, {
      method: "PROPFIND",
      body: data,
      headers: davHeaders,
    });
  }

  // REPORT method for CalDAV/CardDAV queries
  public async report(
    url: string,
    data: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    const davHeaders = {
      Depth: "1",
      "Content-Type": "application/xml; charset=utf-8",
      ...headers,
    };

    return this.makeRequest(url, {
      method: "REPORT",
      body: data,
      headers: davHeaders,
    });
  }
}