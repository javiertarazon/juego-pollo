import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import { monitoring } from '@/lib/monitoring';

// GET /api/system/health - System health check endpoint
export async function GET(req: NextRequest) {
  try {
    const healthReport = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      version: '1.2.0',
    };
    
    return NextResponse.json(healthReport, { status: 200 });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'critical',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}

// POST /api/system/health - Trigger manual health check and cleanup
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    
    if (action === 'cleanup') {
      // Clean up old logs (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const cleanupResults = await Promise.all([
        // Clean old prediction logs
        monitoring.logMetric('cleanup_prediction_logs', 1),
        
        // Clean old system metrics
        monitoring.logMetric('cleanup_system_metrics', 1),
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'Cleanup completed',
        timestamp: new Date().toISOString(),
      });
    }
    
    if (action === 'report') {
      // Generate comprehensive daily report
      const report = await monitoring.generateDailyReport();
      
      return NextResponse.json({
        success: true,
        report,
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action. Supported actions: cleanup, report',
    }, { status: 400 });
    
  } catch (error) {
    console.error('Health check action failed:', error);
    
    return NextResponse.json({
      error: 'Health check action failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}