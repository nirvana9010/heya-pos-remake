import { Page, Request, Response } from '@playwright/test';

export interface ApiRequest {
  url: string;
  method: string;
  timestamp: number;
  headers: { [key: string]: string };
  postData?: string;
}

export interface ApiResponse {
  url: string;
  status: number;
  timestamp: number;
  headers: { [key: string]: string };
  body?: any;
  timing: number; // Response time in ms
}

export interface NetworkEvent {
  request: ApiRequest;
  response?: ApiResponse;
  error?: string;
}

export class NetworkMonitor {
  private events: NetworkEvent[] = [];
  private page: Page;
  private isMonitoring = false;

  constructor(page: Page) {
    this.page = page;
  }

  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.events = [];
    
    console.log('🌐 Starting network monitoring...');

    // Monitor requests
    this.page.on('request', (request: Request) => {
      const event: NetworkEvent = {
        request: {
          url: request.url(),
          method: request.method(),
          timestamp: Date.now(),
          headers: request.headers(),
          postData: request.postData() || undefined
        }
      };
      
      this.events.push(event);
      
      // Log customer search requests specifically
      if (request.url().includes('/customers/search')) {
        console.log(`📤 SEARCH REQUEST: ${request.method()} ${request.url()}`);
      }
    });

    // Monitor responses
    this.page.on('response', async (response: Response) => {
      const request = response.request();
      const event = this.events.find(e => 
        e.request.url === request.url() && 
        e.request.method === request.method() &&
        !e.response
      );
      
      if (event) {
        try {
          let body;
          const contentType = response.headers()['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            body = await response.json();
          } else {
            body = await response.text();
          }
          
          event.response = {
            url: response.url(),
            status: response.status(),
            timestamp: Date.now(),
            headers: response.headers(),
            body,
            timing: Date.now() - event.request.timestamp
          };
          
          // Log customer search responses specifically
          if (request.url().includes('/customers/search')) {
            console.log(`📥 SEARCH RESPONSE: ${response.status()} (${event.response.timing}ms)`);
            console.log(`📊 Results: ${body?.data?.length || 0} customers`);
          }
        } catch (error) {
          event.error = `Failed to parse response: ${error}`;
          console.log(`❌ Response parsing error for ${request.url()}: ${error}`);
        }
      }
    });

    // Monitor request failures
    this.page.on('requestfailed', (request: Request) => {
      const event = this.events.find(e => 
        e.request.url === request.url() && 
        e.request.method === request.method() &&
        !e.response && !e.error
      );
      
      if (event) {
        event.error = `Request failed: ${request.failure()?.errorText || 'Unknown error'}`;
        
        if (request.url().includes('/customers/search')) {
          console.log(`❌ SEARCH REQUEST FAILED: ${event.error}`);
        }
      }
    });
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🛑 Stopped network monitoring');
  }

  getCustomerSearchEvents(): NetworkEvent[] {
    return this.events.filter(event => 
      event.request.url.includes('/customers/search')
    );
  }

  getFailedRequests(): NetworkEvent[] {
    return this.events.filter(event => event.error);
  }

  getSlowRequests(thresholdMs: number = 1000): NetworkEvent[] {
    return this.events.filter(event => 
      event.response && event.response.timing > thresholdMs
    );
  }

  getAllEvents(): NetworkEvent[] {
    return [...this.events];
  }

  getSearchRequestStats() {
    const searchEvents = this.getCustomerSearchEvents();
    const successful = searchEvents.filter(e => e.response && e.response.status < 400);
    const failed = searchEvents.filter(e => e.error || (e.response && e.response.status >= 400));
    const average = successful.length > 0 
      ? successful.reduce((sum, e) => sum + (e.response?.timing || 0), 0) / successful.length 
      : 0;

    return {
      total: searchEvents.length,
      successful: successful.length,
      failed: failed.length,
      averageResponseTime: Math.round(average),
      events: searchEvents
    };
  }

  async waitForSearchRequest(timeoutMs: number = 5000): Promise<NetworkEvent | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const searchEvents = this.getCustomerSearchEvents();
      const latestEvent = searchEvents[searchEvents.length - 1];
      
      if (latestEvent && (latestEvent.response || latestEvent.error)) {
        return latestEvent;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
  }

  logSummary() {
    const stats = this.getSearchRequestStats();
    console.log('\n📊 Network Monitoring Summary:');
    console.log(`   Total search requests: ${stats.total}`);
    console.log(`   Successful: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Average response time: ${stats.averageResponseTime}ms`);
    
    if (stats.failed > 0) {
      console.log('\n❌ Failed requests:');
      stats.events.filter(e => e.error || (e.response && e.response.status >= 400))
        .forEach(e => {
          console.log(`   ${e.request.method} ${e.request.url} - ${e.error || e.response?.status}`);
        });
    }
  }

  clear() {
    this.events = [];
  }
}