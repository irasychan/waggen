// Waggen State Graph Viewer
(function() {
  'use strict';

  // Ensure data is loaded
  if (!window.CYTOSCAPE_DATA || !window.GRAPH_DATA) {
    document.getElementById('graph-container').innerHTML = '<p class="error">Failed to load graph data</p>';
    return;
  }

  const graphData = window.GRAPH_DATA;
  const cytoscapeData = window.CYTOSCAPE_DATA;

  // Update metadata display
  updateMetadata();

  // Cytoscape style configuration
  const style = [
    // Node styling
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
        'width': 'mapData(elementCount, 0, 20, 60, 120)',
        'height': 'mapData(elementCount, 0, 20, 60, 120)',
        'border-width': 2,
        'border-color': '#2d5a8a',
      }
    },
    // Entry state styling
    {
      selector: 'node[?isEntry]',
      style: {
        'background-color': '#2ecc71',
        'border-color': '#1e8449',
        'text-outline-color': '#2ecc71',
        'border-width': 4,
      }
    },
    // Selected node
    {
      selector: 'node:selected',
      style: {
        'background-color': '#e74c3c',
        'border-color': '#c0392b',
        'text-outline-color': '#e74c3c',
      }
    },
    // Edge styling
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
    // Self-loop edges
    {
      selector: 'edge[source = target]',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distances': [40],
        'control-point-weights': [0.5],
        'loop-direction': '45deg',
        'loop-sweep': '90deg',
      }
    },
    // Selected edge
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#e74c3c',
        'target-arrow-color': '#e74c3c',
        'width': 3,
      }
    },
    // Highlighted elements
    {
      selector: '.highlighted',
      style: {
        'background-color': '#f39c12',
        'line-color': '#f39c12',
        'target-arrow-color': '#f39c12',
      }
    }
  ];

  // Initialize Cytoscape
  const cy = cytoscape({
    container: document.getElementById('graph-container'),
    elements: [...cytoscapeData.nodes, ...cytoscapeData.edges],
    style: style,
    layout: {
      name: 'cose',
      animate: true,
      animationDuration: 500,
      randomize: false,
      nodeRepulsion: function(node) { return 8000; },
      nodeOverlap: 20,
      idealEdgeLength: function(edge) { return 100; },
      edgeElasticity: function(edge) { return 100; },
      nestingFactor: 1.2,
      gravity: 1,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
      fit: true,
      padding: 50,
    },
    minZoom: 0.2,
    maxZoom: 3,
    wheelSensitivity: 0.3,
  });

  // DOM references
  const panelPlaceholder = document.getElementById('panel-placeholder');
  const stateDetails = document.getElementById('state-details');
  const edgeDetails = document.getElementById('edge-details');

  // Event handlers
  cy.on('tap', 'node', function(event) {
    const node = event.target;
    showStateDetails(node.data());
  });

  cy.on('tap', 'edge', function(event) {
    const edge = event.target;
    showEdgeDetails(edge.data());
  });

  cy.on('tap', function(event) {
    if (event.target === cy) {
      hideAllDetails();
    }
  });

  // Control buttons
  document.getElementById('fit-btn').addEventListener('click', function() {
    cy.fit(50);
  });

  document.getElementById('reset-btn').addEventListener('click', function() {
    cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      randomize: true,
      fit: true,
      padding: 50,
    }).run();
  });

  // Helper functions
  function updateMetadata() {
    const meta = graphData.metadata;
    document.getElementById('meta-url').textContent = meta.appUrl;
    document.getElementById('meta-states').textContent = `${meta.totalStates} states`;
    document.getElementById('meta-transitions').textContent = `${meta.totalTransitions} transitions`;
    document.getElementById('meta-duration').textContent = `${(meta.explorationDurationMs / 1000).toFixed(1)}s`;
  }

  function showStateDetails(data) {
    hideAllDetails();
    panelPlaceholder.classList.add('hidden');
    stateDetails.classList.remove('hidden');

    document.getElementById('detail-id').textContent = data.id;
    document.getElementById('detail-description').textContent = data.description;
    document.getElementById('detail-url').textContent = data.url;
    document.getElementById('detail-hash').textContent = data.domHash;
    document.getElementById('detail-element-count').textContent = data.elementCount;

    // Populate element list
    const elementList = document.getElementById('element-list');
    elementList.innerHTML = '';

    if (data.elements && data.elements.length > 0) {
      data.elements.forEach(function(el) {
        const li = document.createElement('li');
        li.className = 'element-item';
        li.innerHTML = `
          <span class="element-type">${el.type}</span>
          <span class="element-label">${escapeHtml(el.label)}</span>
          <code class="element-selector">${escapeHtml(el.selector)}</code>
        `;
        elementList.appendChild(li);
      });
    } else {
      elementList.innerHTML = '<li class="no-items">No interactive elements</li>';
    }
  }

  function showEdgeDetails(data) {
    hideAllDetails();
    panelPlaceholder.classList.add('hidden');
    edgeDetails.classList.remove('hidden');

    const sourceNode = cy.getElementById(data.source);
    const targetNode = cy.getElementById(data.target);

    document.getElementById('edge-from').textContent = sourceNode.data('description') || data.source;
    document.getElementById('edge-to').textContent = targetNode.data('description') || data.target;

    // Populate action list
    const actionList = document.getElementById('action-list');
    actionList.innerHTML = '';

    if (data.actions && data.actions.length > 0) {
      data.actions.forEach(function(action) {
        const li = document.createElement('li');
        li.className = 'action-item';
        li.innerHTML = `
          <span class="action-type">${action.type}</span>
          <span class="action-label">${escapeHtml(action.elementLabel)}</span>
          <code class="action-selector">${escapeHtml(action.selector)}</code>
          ${action.value ? `<span class="action-value">Value: "${escapeHtml(action.value)}"</span>` : ''}
        `;
        actionList.appendChild(li);
      });
    } else {
      actionList.innerHTML = '<li class="no-items">No actions</li>';
    }
  }

  function hideAllDetails() {
    panelPlaceholder.classList.remove('hidden');
    stateDetails.classList.add('hidden');
    edgeDetails.classList.add('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Initial view
  hideAllDetails();

  // Keyboard shortcuts
  document.addEventListener('keydown', function(event) {
    if (event.key === 'f' || event.key === 'F') {
      cy.fit(50);
    }
    if (event.key === 'Escape') {
      cy.elements().unselect();
      hideAllDetails();
    }
  });

})();
