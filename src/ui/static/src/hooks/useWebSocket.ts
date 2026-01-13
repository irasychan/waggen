import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store';
import type {
  WSMessage,
  ConnectionInitPayload,
  StateUpdatePayload,
  GraphUpdatePayload,
  ActionResultPayload,
  ErrorPayload,
  SessionSavedPayload,
} from '@/types';

const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setConnectionStatus,
    setSession,
    setCurrentState,
    setAvailableActions,
    setGraphData,
    setPathFromRoot,
    setExecutionStatus,
  } = useStore();

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'connection_init': {
        const payload = message.payload as ConnectionInitPayload;
        setSession(payload.session);
        setCurrentState(payload.currentState);
        setAvailableActions(payload.availableActions);
        setGraphData(payload.session.stateGraph);
        setExecutionStatus('Connected');
        break;
      }
      case 'state_update': {
        const payload = message.payload as StateUpdatePayload;
        setCurrentState(payload.currentState);
        setAvailableActions(payload.availableActions);
        setPathFromRoot(payload.pathFromRoot);
        break;
      }
      case 'graph_update': {
        const payload = message.payload as GraphUpdatePayload;
        setGraphData(payload.graphData);
        break;
      }
      case 'action_result': {
        const payload = message.payload as ActionResultPayload;
        if (payload.success) {
          if (payload.isNewState) {
            setExecutionStatus(`New state discovered: ${payload.newStateId}`);
          } else {
            setExecutionStatus(`Navigated to: ${payload.newStateId}`);
          }
        } else {
          setExecutionStatus(`Action failed: ${payload.error || 'Unknown error'}`);
        }
        break;
      }
      case 'error': {
        const payload = message.payload as ErrorPayload;
        setExecutionStatus(`Error: ${payload.message}`);
        console.error('WebSocket error:', payload);
        break;
      }
      case 'session_saved': {
        const payload = message.payload as SessionSavedPayload;
        setExecutionStatus(`Session saved: ${payload.filePath}`);
        break;
      }
    }
  }, [setSession, setCurrentState, setAvailableActions, setGraphData, setPathFromRoot, setExecutionStatus]);

  const connect = useCallback(() => {
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      setExecutionStatus('Connected to server');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      wsRef.current = null;

      // Exponential backoff reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        setExecutionStatus(`Disconnected. Reconnecting in ${delay / 1000}s...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        setExecutionStatus('Connection failed. Please refresh the page.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }, [setConnectionStatus, setExecutionStatus, handleMessage]);

  const send = useCallback((type: string, payload: unknown = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type,
        timestamp: Date.now(),
        payload,
      }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Action helpers
  const executeAction = useCallback((actionId: string) => {
    setExecutionStatus('Executing action...');
    send('execute_action', { actionId });
  }, [send, setExecutionStatus]);

  const skipAction = useCallback((actionId: string, stateId: string) => {
    send('skip_action', { actionId, stateId });
  }, [send]);

  const unskipAction = useCallback((actionId: string, stateId: string) => {
    send('unskip_action', { actionId, stateId });
  }, [send]);

  const jumpToState = useCallback((targetStateId: string) => {
    setExecutionStatus(`Jumping to state: ${targetStateId}...`);
    send('jump_to_state', { targetStateId });
  }, [send, setExecutionStatus]);

  const goToRoot = useCallback(() => {
    setExecutionStatus('Returning to root state...');
    send('go_to_root', {});
  }, [send, setExecutionStatus]);

  const saveSession = useCallback((filePath?: string) => {
    setExecutionStatus('Saving session...');
    send('save_session', { filePath });
  }, [send, setExecutionStatus]);

  const requestState = useCallback(() => {
    send('request_state', {});
  }, [send]);

  return {
    connect,
    disconnect,
    executeAction,
    skipAction,
    unskipAction,
    jumpToState,
    goToRoot,
    saveSession,
    requestState,
  };
}
