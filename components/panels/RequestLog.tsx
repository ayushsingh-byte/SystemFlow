'use client';

import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect } from 'react';

const REASON_LABEL: Record<string, string> = {
  capacity_overflow: 'Capacity',
  rate_limited: 'Rate Limit',
  timeout: 'Timeout',
  failure_rate: 'Failure',
};

export default function RequestLog() {
  const { requestLog, clearRequestLog } = useStore();
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid #1e2d3d', flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: 12, color: '#9ba8b5', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            Request Log
          </span>
          <span style={{
            marginLeft: 8, padding: '2px 7px', background: '#1e2d3d',
            borderRadius: 3, fontSize: 11, color: '#9ba8b5', fontFamily: 'monospace',
          }}>
            {requestLog.length}
          </span>
        </div>
        <button
          onClick={clearRequestLog}
          style={{
            background: 'transparent', border: '1px solid #1e2d3d',
            borderRadius: 4, padding: '3px 10px',
            fontSize: 11, color: '#636e7b', fontFamily: 'monospace',
            cursor: 'pointer', transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#374151';
            (e.currentTarget as HTMLElement).style.color = '#9ba8b5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#1e2d3d';
            (e.currentTarget as HTMLElement).style.color = '#636e7b';
          }}
        >
          Clear
        </button>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr 72px 80px',
        padding: '6px 12px', borderBottom: '1px solid #1e2d3d',
        flexShrink: 0, gap: 6,
      }}>
        {['ID', 'Path', 'Latency', 'Status'].map((h) => (
          <span key={h} style={{ fontSize: 10, color: '#374151', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {h}
          </span>
        ))}
      </div>

      {/* List */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
        {requestLog.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#374151', fontFamily: 'monospace', fontSize: 13 }}>
            No requests yet. Run simulation to see log.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {requestLog.slice(0, 150).map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8, backgroundColor: entry.status === 'failed' ? '#ef444415' : '#10b98115' }}
                animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr 72px 80px',
                  padding: '5px 12px', gap: 6,
                  borderBottom: '1px solid #0d1117',
                }}
              >
                {/* ID */}
                <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>
                  {entry.id.replace('req-', '#')}
                </span>

                {/* Path */}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 11, color: '#7d8fa0', fontFamily: 'monospace',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {entry.path.join(' → ')}
                  </div>
                  {entry.failReason && (
                    <div style={{
                      fontSize: 10, color: '#ef444490', fontFamily: 'monospace', marginTop: 2,
                    }}>
                      ✕ at {entry.failedAt} ({REASON_LABEL[entry.failReason] || entry.failReason})
                    </div>
                  )}
                </div>

                {/* Latency */}
                <span style={{
                  fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                  color: entry.latency > 1000 ? '#ef4444' : entry.latency > 500 ? '#f59e0b' : '#10b981',
                }}>
                  {entry.latency}ms
                </span>

                {/* Status */}
                <span style={{
                  fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                  color: entry.status === 'success' ? '#10b981' : '#ef4444',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {entry.status === 'success' ? '✓ OK' : `✕ ${REASON_LABEL[entry.failReason || ''] || 'FAIL'}`}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
