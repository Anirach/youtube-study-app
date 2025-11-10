/**
 * LightRAG Service Wrapper
 * Node.js wrapper for Python LightRAG service
 */

const { spawn } = require('child_process');
const path = require('path');

class LightRAGService {
  constructor() {
    this.pythonScript = path.join(__dirname, '../python/lightrag_service.py');
    this.workingDir = process.env.LIGHTRAG_WORKING_DIR || path.join(__dirname, '../../lightrag_data');
  }

  /**
   * Execute Python LightRAG command
   */
  async executePython(command, args = []) {
    return new Promise((resolve, reject) => {
      const pythonArgs = [this.pythonScript, command, ...args];
      
      const env = {
        ...process.env,
        LIGHTRAG_WORKING_DIR: this.workingDir,
        PYTHONUNBUFFERED: '1'
      };

      const python = spawn('python3', pythonArgs, { env });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('LightRAG stderr:', data.toString());
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  /**
   * Insert video content into LightRAG knowledge graph
   */
  async insertVideo(videoId, content) {
    try {
      const contentJson = JSON.stringify(content);
      const result = await this.executePython('insert', [videoId, contentJson]);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to insert video');
      }

      return result;
    } catch (error) {
      console.error('Error inserting video into LightRAG:', error);
      throw new Error(`Failed to insert video: ${error.message}`);
    }
  }

  /**
   * Query the knowledge graph
   */
  async query(queryText, mode = 'hybrid') {
    try {
      const result = await this.executePython('query', [queryText, mode]);
      
      if (!result.success) {
        throw new Error(result.error || 'Query failed');
      }

      return result;
    } catch (error) {
      console.error('Error querying LightRAG:', error);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Get knowledge graph data for visualization
   */
  async getGraphData() {
    try {
      const result = await this.executePython('get_graph');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get graph data');
      }

      return {
        nodes: result.nodes || [],
        edges: result.edges || [],
        stats: result.stats || { total_nodes: 0, total_edges: 0 }
      };
    } catch (error) {
      console.error('Error getting graph data:', error);
      throw new Error(`Failed to get graph data: ${error.message}`);
    }
  }

  /**
   * Clear all graph data
   */
  async clearGraph() {
    try {
      const result = await this.executePython('clear');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear graph');
      }

      return result;
    } catch (error) {
      console.error('Error clearing graph:', error);
      throw new Error(`Failed to clear graph: ${error.message}`);
    }
  }

  /**
   * Build relationships for a video using LightRAG's entity extraction
   */
  async buildRelationships(videoId, content) {
    try {
      // Insert video first (this will extract entities and relationships)
      await this.insertVideo(videoId, content);

      // Get the full graph to find relationships
      const graphData = await this.getGraphData();

      // Find relationships related to this video
      // LightRAG creates entities from the content, so we look for edges
      const relationships = [];
      
      // This is a simplified approach - in production, you'd want to
      // track which entities belong to which video
      for (const edge of graphData.edges) {
        relationships.push({
          source: edge.source,
          target: edge.target,
          relation: edge.relation,
          weight: edge.weight,
          description: edge.description
        });
      }

      return relationships;
    } catch (error) {
      console.error('Error building relationships:', error);
      throw new Error(`Failed to build relationships: ${error.message}`);
    }
  }

  /**
   * Get statistics about the knowledge graph
   */
  async getStats() {
    try {
      const graphData = await this.getGraphData();
      return {
        totalNodes: graphData.stats.total_nodes,
        totalEdges: graphData.stats.total_edges,
        provider: 'LightRAG'
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalNodes: 0,
        totalEdges: 0,
        provider: 'LightRAG',
        error: error.message
      };
    }
  }
}

module.exports = new LightRAGService();

