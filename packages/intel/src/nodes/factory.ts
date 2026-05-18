import type { NodeDNA } from '../types.js';
import { BaseNode }            from './BaseNode.js';
import { StatelessHttpWorker } from './families/StatelessHttpWorker.js';
import { RelationalDatabase }  from './families/RelationalDatabase.js';
import { InMemoryStore }        from './families/InMemoryStore.js';
import { MessageBroker }        from './families/MessageBroker.js';
import { ContainerOrchestrator } from './families/ContainerOrchestrator.js';
import { ComputeWorkload }      from './families/ComputeWorkload.js';
import { StorageSystem }        from './families/StorageSystem.js';
import { ApplicationRuntime }   from './families/ApplicationRuntime.js';

/**
 * NodeFactory — instantiate the correct family class given a node_id and DNA.
 *
 * The switch is keyed on dna.family which is a discriminated union
 * (NodeFamily type), so TypeScript exhaustiveness checking applies.
 */
export function createNode(node_id: string, dna: NodeDNA): BaseNode {
  switch (dna.family) {
    case 'StatelessHttpWorker':  return new StatelessHttpWorker(node_id, dna);
    case 'RelationalDatabase':   return new RelationalDatabase(node_id, dna);
    case 'InMemoryStore':        return new InMemoryStore(node_id, dna);
    case 'MessageBroker':        return new MessageBroker(node_id, dna);
    case 'ContainerOrchestrator': return new ContainerOrchestrator(node_id, dna);
    case 'ComputeWorkload':      return new ComputeWorkload(node_id, dna);
    case 'StorageSystem':        return new StorageSystem(node_id, dna);
    case 'ApplicationRuntime':   return new ApplicationRuntime(node_id, dna);
    // TypeScript will flag a missing case here if NodeFamily grows.
    default: {
      // Narrow to `never` to get exhaustiveness checking at compile time.
      const _exhaustive: never = dna.family;
      throw new Error(`Unknown node family: ${String(_exhaustive)}`);
    }
  }
}
