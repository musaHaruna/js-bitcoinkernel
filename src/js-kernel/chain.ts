import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import {
    btck_chain_parameters_create,
    btck_chain_parameters_destroy,
    btck_chain_parameters_copy,
    btck_chain_parameters_get_consensus_params
 } from "./ffi/bindings.js";

/**
 * Enumeration of supported Bitcoin network types.
 */
export enum ChainType {
    MAINNET = 0, // Main Bitcoin network 
    TESTNET = 1, // Test Bitcoin network
    TESTNET_4 = 2, // Testnet4 Bitcoin network 
    SIGNET = 3, // Signet Bitcoin network 
    REGTEST = 4, // Regression test network
}

/**
 * A read-only view of the consensus parameters governing a specific blockchain.
 *
 * This class wraps an opaque pointer to the internal consensus ruleset of the native kernel.
 * It encapsulates deployment-specific logic and activation heights for Bitcoin forks and consensus
 * rules, such as BIP deployment parameters (e.g., SegWit, Taproot), block subsidy halving intervals,
 * and difficulty adjustment targets.
 *
 * Typically obtained as a borrowed view from a parent {@link ChainParameters} instance.
 */
export class ConsensusParams extends KernelOpaquePtr {
    /**
     * Wrap an existing native consensus parameters pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to false when acting as a view.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) {
        super(ptr, ownsPtr, parent);
    }
}

/**
 * Chain parameters describing structural and identity properties of a Bitcoin network.
 *
 * This class defines network-specific constants, genesis block characteristics, default network ports,
 * and base protocol requirements unique to a specific network deployment (e.g., Mainnet, Testnet, Signet, or Regtest).
 * It acts as the primary configuration vehicle for bootstrapping a native kernel context.
 */
export class ChainParameters extends KernelOpaquePtr {
    public static override createFn = btck_chain_parameters_create;
    public static override destroyFn = btck_chain_parameters_destroy;
    public static override copyFn = btck_chain_parameters_copy;

    /**
     * Internal constructor required by `KernelOpaquePtrConstructor` for pointer instantiation.
     *
     * Used when wrapping raw handles returned downstream by factory methods or network queries.
     *
     * @param ptr - The native memory handle.
     * @param ownsPtr - Flag indicating if JavaScript governs the unmanaged memory lifecycle.
     * @param parent - Context parent reference, if this handle is pinned to a lifecycle subtree.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
    
    /**
     * Public-facing constructor to instantiate network specifications from an established deployment enum.
     *
     * @param chainType - The specific Bitcoin network configuration to initialize.
     */
    constructor(chainType: ChainType);
    
    /**
     * Unified polymorphic constructor implementation handling both direct pointer wrapping and native lifecycle instantiation.
     *
     * @throws {Error} If `btck_chain_parameters_create` is unavailable or if the native allocation fails.
     */
    constructor(arg: bigint | ChainType, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) {
        if (typeof arg === "bigint") {
            // Instantiated via pointer (e.g., inside internal factory methods)
            super(arg, ownsPtr, parent);
        } else {
            // Instantiated directly by user via ChainType enum
            if (!btck_chain_parameters_create) {
                throw new Error("btck_chain_parameters_create unavailable");
            }
            const ptr = btck_chain_parameters_create(arg) as bigint;
            super(ptr, true, null);
        }
    }

    /**
     * Access the consensus parameters tied to this network definition.
     *
     * This getter extracts the inner consensus sub-configuration context from the native layer.
     *
     * * @note This method returns a **borrowed view** whose underlying allocation is structurally dependent
     * on the lifecycle of this `ChainParameters` parent. To safeguard unmanaged memory integrity, the returned instance
     * is explicitly linked to `this` instance to prevent premature garbage collection sweeps.
     *
     * @returns A {@link ConsensusParams} wrapper instance observing the target parameters.
     * @throws {Error} If `btck_chain_parameters_get_consensus_params` is unavailable.
     */
    get consensusParams(): ConsensusParams {
        if (!btck_chain_parameters_get_consensus_params) {
            throw new Error("btck_chain_parameters_get_consensus_params unavailable");
        }

        const ptr = btck_chain_parameters_get_consensus_params(
            this.getHandle(),
        ) as bigint;

        // Instantiates an unowned dependent view linked back to this parent instance
        return ConsensusParams.fromView(ptr, this);
    }
}