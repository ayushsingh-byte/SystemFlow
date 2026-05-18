import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { NodeDNA, SignalName, ReactionPattern } from '../types.js';

// When compiled, __dirname is packages/intel/dist/dna — go up four levels to reach repo root, then into dna/
const DNA_DIR = path.resolve(__dirname, '../../../../dna');

export class DNALoader {
  private cache = new Map<string, NodeDNA>();

  /**
   * Load DNA for a node type (e.g. "nginx", "postgresql"). Cached after first load.
   * Returns null if the file does not exist.
   */
  load(nodeType: string): NodeDNA | null {
    const cached = this.cache.get(nodeType);
    if (cached !== undefined) return cached;

    const filePath = path.join(DNA_DIR, `${nodeType}.dna.yaml`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(raw) as Record<string, unknown>;

    const dna = this._validate(parsed, filePath);
    this.cache.set(nodeType, dna);
    return dna;
  }

  /** Load all DNA files in the DNA_DIR. Returns map of type→DNA. */
  loadAll(): Map<string, NodeDNA> {
    if (!fs.existsSync(DNA_DIR)) return this.cache;

    const files = fs.readdirSync(DNA_DIR).filter(f => f.endsWith('.dna.yaml'));
    for (const file of files) {
      const nodeType = file.replace('.dna.yaml', '');
      if (!this.cache.has(nodeType)) {
        this.load(nodeType);
      }
    }
    return new Map(this.cache);
  }

  /**
   * Return reaction patterns that could produce `affectedSignal` as a
   * downstream effect on nodes of `nodeType`.
   */
  findPatternsProducing(
    nodeType: string,
    affectedSignal: string,
  ): Array<{ pattern: ReactionPattern; dna: NodeDNA }> {
    const dna = this.load(nodeType);
    if (dna === null) return [];

    const results: Array<{ pattern: ReactionPattern; dna: NodeDNA }> = [];
    for (const pattern of dna.reaction_patterns) {
      const produces = pattern.expected_downstream_effects.some(
        e => e.affected_signal === (affectedSignal as SignalName),
      );
      if (produces) {
        results.push({ pattern, dna });
      }
    }
    return results;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _validate(raw: Record<string, unknown>, filePath: string): NodeDNA {
    if (typeof raw['type'] !== 'string' || raw['type'].length === 0) {
      throw new Error(`DNA file ${filePath} is missing required field "type"`);
    }
    if (typeof raw['family'] !== 'string' || raw['family'].length === 0) {
      throw new Error(`DNA file ${filePath} is missing required field "family"`);
    }

    // Trust the YAML structure — cast directly to NodeDNA.
    // health_signals.critical / warning / informational are SignalName[] per authoring contract.
    // reaction_patterns[].trigger.signal is SignalName per authoring contract.
    return raw as unknown as NodeDNA;
  }
}

/** Singleton loader — shared across the process. */
export const dnaLoader = new DNALoader();
