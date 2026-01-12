// Waggen Interactive Explorer
(function() {
  'use strict';

  // State
  let ws = null;
  let cy = null;
  let currentState = null;
  let availableActions = [];
  let actionMap = {};  // Map of index -> action for button clicks
  let graphData = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;

  // DOM elements
  const connectionStatus = document.getElementById('connection-status');
  const executionStatus = document.getElementById('execution-status');
  const currentStateId = document.getElementById('current-state-id');
  const currentStateDesc = document.getElementById('current-state-desc');
  const currentStateUrl = document.getElementById('current-state-url');
  const actionList = document.getElementById('action-list');
  const actionCount = document.getElementById('action-count');
  const treeContainer = document.getElementById('tree-container');
  const selectedStateDetails = document.getElementById('selected-state-details');

  // Initialize
  function init() {
    initCytoscape();
    connectWebSocket();
    setupEventListeners();
  }

  // WebSocket connection
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
      console.log('Connected to server');
      connectionStatus.textContent = 'Connected';
      connectionStatus.className = 'status-connected';
      reconnectAttempts = 0;
    };

    ws.onclose = function() {
      console.log('Disconnected from server');
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.className = 'status-disconnected';

      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(connectWebSocket, delay);
        reconnectAttempts++;
      }
    };

    ws.onerror = function(error) {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  // Message handlers
  function handleMessage(message) {
    switch (message.type) {
      case 'connection_init':
        handleConnectionInit(message.payload);
        break;
      case 'state_update':
        handleStateUpdate(message.payload);
        break;
      case 'graph_update':
        handleGraphUpdate(message.payload);
        break;
      case 'action_result':
        handleActionResult(message.payload);
        break;
      case 'error':
        handleError(message.payload);
        break;
      case 'session_saved':
        alert(`Session saved to: ${message.payload.filePath}`);
        break;
    }
  }

  function handleConnectionInit(payload) {
    console.log('Received initial state:', payload);
    graphData = payload.session.stateGraph;
    currentState = payload.currentState;
    availableActions = payload.availableActions;

    updateCurrentStateDisplay();
    updateActionList();
    updateGraph();
    updateTree();
  }

  function handleStateUpdate(payload) {
    console.log('State update:', payload);
    currentState = payload.currentState;
    availableActions = payload.availableActions;

    updateCurrentStateDisplay();
    updateActionList();
    highlightCurrentState();
    updateTree();

    executionStatus.textContent = '';
  }

  function handleGraphUpdate(payload) {
    console.log('Graph update:', payload);
    graphData = payload.graphData;

    updateGraph();
    updateTree();
  }

  function handleActionResult(payload) {
    console.log('Action result:', payload);

    if (payload.success) {
      if (payload.isNewState) {
        executionStatus.textContent = `New state discovered: ${payload.newStateId}`;
      } else {
        executionStatus.textContent = 'Action completed';
      }
    } else {
      executionStatus.textContent = `Action failed: ${payload.error || 'Unknown error'}`;
    }
  }

  function handleError(payload) {
    console.error('Server error:', payload);
    alert(`Error: ${payload.message}`);
    executionStatus.textContent = '';
  }

  // Send messages
  function send(type, payload) {
    console.log('Sending message:', type, payload);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: type,
        timestamp: Date.now(),
        payload: payload
      }));
    } else {
      console.error('WebSocket not connected, readyState:', ws ? ws.readyState : 'null');
      executionStatus.textContent = 'Error: Not connected to server';
    }
  }

  // UI Updates
  function updateCurrentStateDisplay() {
    if (currentState) {
      currentStateId.textContent = currentState.id;
      currentStateDesc.textContent = currentState.description;
      currentStateUrl.textContent = currentState.url;
    }
  }

  function updateActionList() {
    actionList.innerHTML = '';
    actionCount.textContent = `(${availableActions.length})`;
    actionMap = {};  // Reset action map

    if (availableActions.length === 0) {
      actionList.innerHTML = '<p class="no-actions">No actions available</p>';
      return;
    }

    availableActions.forEach(function(item, index) {
      // Store action in map with numeric index
      actionMap[index] = item;

      const div = document.createElement('div');
      div.className = 'action-item';
      if (item.isSkipped) div.classList.add('skipped');
      if (item.isExplored) div.classList.add('explored');

      const actionType = item.action.type;
      const actionLabel = escapeHtml(item.action.elementLabel);
      const actionValue = item.action.value ? ` = "${escapeHtml(item.action.value)}"` : '';

      div.innerHTML = `
        <div class="action-info">
          <span class="action-type">${actionType}</span>
          <span class="action-label">${actionLabel}${actionValue}</span>
          ${item.isExplored ? `<span class="action-result">→ ${item.resultStateId || '?'}</span>` : ''}
        </div>
        <div class="action-buttons">
          ${item.isSkipped ?
            `<button class="btn-unskip" data-action-idx="${index}">Unskip</button>` :
            `<button class="btn-execute" data-action-idx="${index}" ${item.isExplored ? 'disabled' : ''}>Execute</button>
             <button class="btn-skip" data-action-idx="${index}">Skip</button>`
          }
        </div>
      `;

      actionList.appendChild(div);
    });

    // Add event listeners
    actionList.querySelectorAll('.btn-execute').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.actionIdx, 10);
        const item = actionMap[idx];
        if (item) executeAction(item.id);
      });
    });

    actionList.querySelectorAll('.btn-skip').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.actionIdx, 10);
        const item = actionMap[idx];
        if (item) skipAction(item.id);
      });
    });

    actionList.querySelectorAll('.btn-unskip').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.actionIdx, 10);
        const item = actionMap[idx];
        if (item) unskipAction(item.id);
      });
    });
  }

  function updateTree() {
    if (!graphData) return;

    const entryStateId = graphData.entryStateId;
    const states = graphData.states;
    const transitions = graphData.transitions;

    // Build adjacency list
    const children = {};
    transitions.forEach(function(t) {
      if (!children[t.fromStateId]) children[t.fromStateId] = new Set();
      if (t.toStateId !== t.fromStateId) {
        children[t.fromStateId].add(t.toStateId);
      }
    });

    // Build tree HTML
    function buildTreeNode(stateId, visited) {
      if (visited.has(stateId)) return '';
      visited.add(stateId);

      const state = states[stateId];
      if (!state) return '';

      const isCurrent = currentState && currentState.id === stateId;
      const isEntry = stateId === entryStateId;

      let html = `<div class="tree-node ${isCurrent ? 'current' : ''} ${isEntry ? 'entry' : ''}" data-state-id="${stateId}">`;
      html += `<span class="tree-label">${isEntry ? '[Entry] ' : ''}${state.id}</span>`;
      html += `<span class="tree-desc">${escapeHtml(state.description.slice(0, 30))}</span>`;
      html += '</div>';

      const childStates = children[stateId];
      if (childStates && childStates.size > 0) {
        html += '<div class="tree-children">';
        childStates.forEach(function(childId) {
          html += buildTreeNode(childId, visited);
        });
        html += '</div>';
      }

      return html;
    }

    const visited = new Set();
    treeContainer.innerHTML = buildTreeNode(entryStateId, visited);

    // Add click handlers
    treeContainer.querySelectorAll('.tree-node').forEach(function(node) {
      node.addEventListener('click', function(e) {
        e.stopPropagation();
        jumpToState(this.dataset.stateId);
      });
    });
  }

  // Cytoscape initialization
  function initCytoscape() {
    cy = cytoscape({
      container: document.getElementById('graph-container'),
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#4a90d9',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#fff',
            'text-outline-color': '#4a90d9',
            'text-outline-width': 2,
            'font-size': '12px',
            'width': 60,
            'height': 60,
            'border-width': 2,
            'border-color': '#2d5a8a',
          }
        },
        {
          selector: 'node[?isEntry]',
          style: {
            'background-color': '#2ecc71',
            'border-color': '#1e8449',
            'text-outline-color': '#2ecc71',
            'border-width': 4,
          }
        },
        {
          selector: 'node.current',
          style: {
            'background-color': '#f39c12',
            'border-color': '#d68910',
            'text-outline-color': '#f39c12',
            'border-width': 4,
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#e74c3c',
            'border-color': '#c0392b',
            'text-outline-color': '#e74c3c',
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#95a5a6',
            'target-arrow-color': '#95a5a6',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'color': '#555',
          }
        },
        {
          selector: 'edge[source = target]',
          style: {
            'curve-style': 'unbundled-bezier',
            'control-point-distances': [40],
            'control-point-weights': [0.5],
          }
        },
      ],
      layout: { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    // Node click handler
    cy.on('tap', 'node', function(event) {
      const node = event.target;
      showStateDetails(node.data());

      // Double-click to jump
      if (event.originalEvent.detail === 2) {
        jumpToState(node.data('id'));
      }
    });

    cy.on('tap', function(event) {
      if (event.target === cy) {
        clearStateDetails();
      }
    });
  }

  function updateGraph() {
    if (!cy || !graphData) return;

    // Convert to Cytoscape format
    const nodes = [];
    const edges = [];

    Object.values(graphData.states).forEach(function(state) {
      nodes.push({
        data: {
          id: state.id,
          label: state.id,
          description: state.description,
          url: state.url,
          domHash: state.domHash,
          elementCount: state.elements.length,
          isEntry: state.id === graphData.entryStateId,
          elements: state.elements,
        }
      });
    });

    // Aggregate transitions
    const edgeMap = {};
    graphData.transitions.forEach(function(t) {
      const key = `${t.fromStateId}->${t.toStateId}`;
      if (!edgeMap[key]) {
        edgeMap[key] = [];
      }
      edgeMap[key].push(t);
    });

    let edgeIndex = 0;
    Object.entries(edgeMap).forEach(function([key, transitions]) {
      const parts = key.split('->');
      const labels = transitions.slice(0, 2).map(function(t) {
        return t.action.elementLabel.slice(0, 15);
      });
      const label = labels.join(', ') + (transitions.length > 2 ? ` (+${transitions.length - 2})` : '');

      edges.push({
        data: {
          id: `edge_${edgeIndex++}`,
          source: parts[0],
          target: parts[1],
          label: label,
        }
      });
    });

    // Update Cytoscape
    cy.elements().remove();
    cy.add(nodes);
    cy.add(edges);

    // Run layout
    cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      nodeRepulsion: function() { return 8000; },
      idealEdgeLength: function() { return 100; },
      fit: true,
      padding: 50,
    }).run();

    highlightCurrentState();
  }

  function highlightCurrentState() {
    if (!cy || !currentState) return;

    cy.nodes().removeClass('current');
    cy.getElementById(currentState.id).addClass('current');
  }

  function showStateDetails(data) {
    selectedStateDetails.innerHTML = `
      <div class="detail-row">
        <label>ID:</label>
        <span>${data.id}</span>
      </div>
      <div class="detail-row">
        <label>Description:</label>
        <span>${escapeHtml(data.description)}</span>
      </div>
      <div class="detail-row">
        <label>URL:</label>
        <span>${escapeHtml(data.url)}</span>
      </div>
      <div class="detail-row">
        <label>DOM Hash:</label>
        <span>${data.domHash}</span>
      </div>
      <div class="detail-row">
        <label>Elements:</label>
        <span>${data.elementCount}</span>
      </div>
      <button class="btn-jump" data-state-id="${data.id}">Jump to this state</button>
    `;

    selectedStateDetails.querySelector('.btn-jump').addEventListener('click', function() {
      jumpToState(this.dataset.stateId);
    });
  }

  function clearStateDetails() {
    selectedStateDetails.innerHTML = '<p class="placeholder">Click a node in the graph to see details</p>';
  }

  // Actions
  function executeAction(actionId) {
    console.log('executeAction called:', actionId);
    executionStatus.textContent = 'Executing action...';
    send('execute_action', { actionId: actionId });
  }

  function skipAction(actionId) {
    console.log('skipAction called:', actionId);
    send('skip_action', { actionId: actionId, stateId: currentState.id });
  }

  function unskipAction(actionId) {
    console.log('unskipAction called:', actionId);
    send('unskip_action', { actionId: actionId, stateId: currentState.id });
  }

  function jumpToState(stateId) {
    if (currentState && stateId === currentState.id) return;

    executionStatus.textContent = `Navigating to ${stateId}...`;
    send('jump_to_state', { targetStateId: stateId });
  }

  // Event listeners
  function setupEventListeners() {
    document.getElementById('save-btn').addEventListener('click', function() {
      send('save_session', {});
    });

    document.getElementById('root-btn').addEventListener('click', function() {
      send('go_to_root', {});
    });

    document.getElementById('fit-btn').addEventListener('click', function() {
      if (cy) cy.fit(50);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
      if (event.key === 'f' || event.key === 'F') {
        if (cy) cy.fit(50);
      }
      if (event.key === 'Escape') {
        if (cy) cy.elements().unselect();
        clearStateDetails();
      }
    });
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Start
  init();
})();
