import {
  btck_txid_copy,
  btck_txid_destroy,
  btck_txid_equals,
  btck_txid_to_bytes,

  btck_transaction_out_point_copy,
  btck_transaction_out_point_destroy,
  btck_transaction_out_point_get_index,
  btck_transaction_out_point_get_txid,

  btck_transaction_input_copy,
  btck_transaction_input_destroy,
  btck_transaction_input_get_out_point,
  btck_transaction_input_get_sequence,
  btck_transaction_output_copy,
  btck_transaction_output_create,
  btck_transaction_output_destroy,
  btck_transaction_output_get_amount,
  btck_transaction_output_get_script_pubkey,
  btck_transaction_to_bytes,
  btck_transaction_create,
  btck_transaction_destroy,
  btck_transaction_get_input_at,
  btck_transaction_get_output_at,
  btck_transaction_get_txid,
  btck_transaction_get_locktime,
  btck_transaction_copy,
  btck_transaction_count_inputs,
  btck_transaction_count_outputs,
  btck_coin_confirmation_height,
  btck_transaction_spent_outputs_count,
  btck_transaction_spent_outputs_get_coin_at,
  btck_transaction_spent_outputs_destroy,
  btck_transaction_spent_outputs_copy,

  btck_coin_destroy,
  btck_coin_copy,
  btck_coin_get_output,
  btck_coin_is_coinbase
} from "./ffi/bindings.js";

import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import { ScriptPubkey } from "./script.js";
import { ByteWriter } from "./writer.js";
import { LazySequence } from "./util/sequence.js";

/**
 * Identifier for a Bitcoin transaction (Txid).
 *
 * High-level wrapper around a native Txid pointer. Provides safe lifecycle management
 * and convenient conversion utilities.
 * * @note Txid instances cannot be directly constructed from raw bytes via the public API.
 * They are obtained downstream from Transaction or TransactionOutPoint objects.
 */
export class Txid extends KernelOpaquePtr {
  protected static override destroyFn = btck_txid_destroy as (ptr: bigint) => void;

  protected static override copyFn = btck_txid_copy as (ptr: bigint) => bigint;

  /**
     * Create a Txid instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    super(ptr, ownsPtr, parent);
  }

  /**
     * Serialize the transaction ID into raw bytes.
     *
     * @returns A 32-byte Uint8Array representation in internal little-endian byte order.
     * @throws {Error} If btck_txid_to_bytes is unavailable.
     */
  toBytes(): Uint8Array {
    if (!btck_txid_to_bytes) {
      throw new Error("btck_txid_to_bytes unavailable");
    }

    const output = new Uint8Array(32);

    btck_txid_to_bytes(this.getHandle(), output);

    return output;
  }

  /**
     * Get the hexadecimal representation of the transaction ID.
     *
     * @returns The Txid as a 64-character hex string in big-endian
     * byte order (standard Bitcoin display format).
     */
  override toString(): string {
    return Buffer.from(this.toBytes()).reverse().toString("hex");
  }

  /**
     * Compare equality with another Txid value using a native verification check.
     *
     * @param other - Object to compare with.
     * @returns True if both are Txid instances with matching underlying native values.
     * @throws {Error} If btck_txid_equals is unavailable.
     */
  equals(other: unknown): boolean {
    if (!(other instanceof Txid)) {
      return false;
    }

    if (!btck_txid_equals) {
      throw new Error("btck_txid_equals unavailable");
    }

    return Boolean(btck_txid_equals(this.getHandle(), other.getHandle()));
  }

  /**
     * Create a copy of this Txid instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * Reference to a specific output of a Bitcoin transaction.
 *
 * A transaction outpoint uniquely identifies a UTXO (Unspent Transaction Output) or
 * spent output by combining a 32-byte transaction ID (Txid) with a specific output index.
 * This sequence is heavily utilized inside transaction inputs to prove which historical
 * outputs are being claimed and spent.
 * * * @note TransactionOutPoint instances cannot be directly constructed via the public API.
 * They are obtained downstream from TransactionInput objects.
 */
export class TransactionOutPoint extends KernelOpaquePtr {
  protected static override destroyFn = btck_transaction_out_point_destroy as (ptr: bigint) => void;

  protected static override copyFn = btck_transaction_out_point_copy as (ptr: bigint) => bigint;

  /**
     * Create a TransactionOutPoint instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    super(ptr, ownsPtr, parent);
  }

  /**
     * The output index within the transaction.
     *
     * @returns The zero-based output position (often referred to as `vout`).
     * @throws {Error} If btck_transaction_out_point_get_index is unavailable.
     */
  get index(): number {
    if (!btck_transaction_out_point_get_index) {
      throw new Error("btck_transaction_out_point_get_index unavailable");
    }

    return btck_transaction_out_point_get_index(this.getHandle());
  }

  /**
     * The transaction ID being referenced.
     *
     * @returns The Txid of the transaction containing the output, instantiated
     * as a dependent non-owning view tied to the lifecycle of this outpoint.
     * @throws {Error} If btck_transaction_out_point_get_txid is unavailable, or if the native
     * layer returns an invalid null pointer handle.
     */
  get txid(): Txid {
    if (!btck_transaction_out_point_get_txid) {
      throw new Error("btck_transaction_out_point_get_txid unavailable");
    }

    const ptr = btck_transaction_out_point_get_txid(this.getHandle()) as bigint;

    if (ptr === 0n) {
      throw new Error("Failed to get Txid pointer from TransactionOutPoint");
    }

    // Instantiated as a dependent view layout: ownsPtr = false, parent = this
    return new Txid(ptr, false, this);
  }

  /**
     * Return a string representation of the transaction outpoint.
     *
     * @returns A descriptive string showing the serialized Txid and output index.
     */
  override toString(): string {
    return `txid=${this.txid.toString()} index=${this.index}`;
  }

  /**
     * Create a copy of this TransactionOutPoint instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * Input to a Bitcoin transaction that spends a historical transaction output.
 *
 * A transaction input (TxIn) spends an existing Unspent Transaction Output (UTXO)
 * by referencing it through an explicit `TransactionOutPoint`. It contains the
 * validation criteria (and sequence rules) required to successfully claim those funds.
 *
 * * @note TransactionInput instances cannot be directly constructed via the public API.
 * They are obtained downstream from Transaction objects.
 */
export class TransactionInput extends KernelOpaquePtr {
  protected static override destroyFn = btck_transaction_input_destroy as (ptr: bigint) => void;

  protected static override copyFn = btck_transaction_input_copy as (ptr: bigint) => bigint;

  /**
     * Create a TransactionInput instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    super(ptr, ownsPtr, parent);
  }

  /**
     * The outpoint being spent by this input.
     *
     * @returns The TransactionOutPoint referencing the targeted previous output,
     * instantiated as a dependent non-owning view tied to the lifecycle of this input.
     * @throws {Error} If btck_transaction_input_get_out_point is unavailable, or if the native
     * layer returns an invalid null pointer handle.
     */
  get outPoint(): TransactionOutPoint {
    if (!btck_transaction_input_get_out_point) {
      throw new Error("btck_transaction_input_get_out_point unavailable");
    }

    const ptr = btck_transaction_input_get_out_point(this.getHandle()) as bigint;

    if (ptr === 0n) {
      throw new Error("Failed to get TransactionOutPoint pointer from TransactionInput");
    }

    // Instantiated as a dependent view layout: ownsPtr = false, parent = this
    return new TransactionOutPoint(ptr, false, this);
  }

  /**
     * The sequence number (nSequence) of this input.
     *
     * This field is typically applied to signal transaction opt-in Replace-By-Fee (RBF),
     * handle relative locktimes (BIP 68), or disable absolute locktimes.
     *
     * @returns The 32-bit unsigned integer sequence value.
     * @throws {Error} If btck_transaction_input_get_sequence is unavailable.
     */
  get sequence(): number {
    if (!btck_transaction_input_get_sequence) {
      throw new Error("btck_transaction_input_get_sequence unavailable");
    }

    return btck_transaction_input_get_sequence(this.getHandle());
  }

  /**
     * Return a string representation of the transaction input.
     *
     * @returns A string representing the underlying outpoint spent by this input.
     */
  override toString(): string {
    return `${this.outPoint.toString()}`;
  }

  /**
     * Create a copy of this TransactionInput instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * Output from a Bitcoin transaction (TxOut) that specifies transferable value.
 *
 * A transaction output defines the numeric amount of bitcoin (denominated in satoshis)
 * being transferred, alongside the explicit spending conditions (`scriptPubkey`)
 * that a future transaction input must satisfy to claim and spend the funds.
 *
 * This wrapper supports a dual lifecycle: it can either construct a brand new
 * native allocation from an active script pubkey and value, or wrap an existing
 * native memory address returned downstream from an established block or transaction.
 */
export class TransactionOutput extends KernelOpaquePtr {
  protected static override destroyFn = btck_transaction_output_destroy as (ptr: bigint) => void;
  protected static override copyFn = btck_transaction_output_copy as (ptr: bigint) => bigint;

  /**
     * Wrap an existing native transaction output pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer.
     * @param parent - The parent object holding this reference, if it's a borrowed view.
     */
  constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
  /**
     * Allocate a brand new native transaction output instance from components.
     *
     * @param scriptPubkey - The script public key defining the output's spending conditions.
     * @param amount - The value allocated to this output, denominated in satoshis.
     */
  constructor(scriptPubkey: ScriptPubkey, amount: bigint | number);
  /**
     * Polymorphic implementation handling both direct pointer wrapping and native allocation.
     *
     * @throws {Error} If `btck_transaction_output_create` is unavailable, or if the native
     * allocation layer fails and returns an invalid null pointer handle.
     */
  constructor(arg1: bigint | ScriptPubkey, arg2?: boolean | bigint | number, arg3: KernelOpaquePtr | null = null) {
    if (arg1 instanceof ScriptPubkey) {
      if (!btck_transaction_output_create) {
        throw new Error("btck_transaction_output_create unavailable");
      }
      const amount = BigInt(arg2 as number | bigint);
      const ptr = btck_transaction_output_create((arg1 as any).getHandle(), amount) as bigint;
      if (ptr === 0n) {
        throw new Error("Failed to create native TransactionOutput");
      }
      super(ptr, true, null);
    } else {
      const ownsPtr = typeof arg2 === "boolean" ? arg2 : true;
      super(arg1 as bigint, ownsPtr, arg3 as KernelOpaquePtr | null);
    }
  }

  /**
     * The value of this output denominated in satoshis.
     *
     * @returns A 64-bit unsigned integer primitive representing the satoshi value.
     * @throws {Error} If `btck_transaction_output_get_amount` is unavailable.
     */
  get amount(): bigint {
    if (!btck_transaction_output_get_amount) {
      throw new Error("btck_transaction_output_get_amount unavailable");
    }
    // Force evaluation into a real runtime BigInt primitive
    return BigInt(btck_transaction_output_get_amount(this.getHandle()));
  }

  /**
     * The spending conditions bound to this output.
     *
     * @returns The ScriptPubkey defining validation criteria, instantiated
     * as a dependent non-owning view tied directly to the lifecycle of this output.
     * @throws {Error} If `btck_transaction_output_get_script_pubkey` is unavailable, or if the native
     * layer returns an invalid null pointer handle.
     */
  get scriptPubkey(): ScriptPubkey {
    if (!btck_transaction_output_get_script_pubkey) {
      throw new Error("btck_transaction_output_get_script_pubkey unavailable");
    }
    const ptr = btck_transaction_output_get_script_pubkey(this.getHandle()) as bigint;
    if (ptr === 0n) {
      throw new Error("Failed to get ScriptPubkey pointer from TransactionOutput");
    }
    return new ScriptPubkey(ptr, false, this);
  }

  /**
     * Return a string representation of the transaction output.
     *
     * @returns A descriptive string showing the satoshi amount and script pubkey byte length.
     */
  override toString(): string {
    return `<TransactionOutput amount=${this.amount} spk_len=${this.scriptPubkey.toBytes().length}>`;
  }

  /**
     * Create a copy of this TransactionOutput instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * A lazily-evaluated sequence view over a transaction's inputs.
 *
 * This collection provides random indexed access to individual transaction inputs by
 * fetching records from the native memory array layout on-demand. It acts as an array-like
 * window that caches its computed total element length on first access to drastically
 * minimize FFI boundary crossing overhead during sequential loops or structural evaluation.
 */
export class TransactionInputSequence extends LazySequence<TransactionInput> {
  /** * The underlying parent transaction holding the native array handle. */
  private readonly _transaction: Transaction;
  /** * Memoized sequence length storage to avoid redundant C API lookups. */
  private _cachedLen?: number;

  /**
     * Create a sequence view of transaction inputs.
     * * @param transaction - The parent transaction containing the input vector under evaluation.
     */
  constructor(transaction: Transaction) {
    super();
    this._transaction = transaction;
  }

  /**
     * The total number of inputs embedded within the transaction.
     * * The result is requested from the native kernel boundary on the first call
     * and cached internally for subsequent evaluations.
     *
     * @returns The evaluated input array size.
     * @throws {Error} If `btck_transaction_count_inputs` is unavailable.
     */
  override get length(): number {
    if (this._cachedLen === undefined) {
      if (!btck_transaction_count_inputs) {
        throw new Error("btck_transaction_count_inputs unavailable");
      }

      // Bypass protected restriction to grab the parent tx handle
      const txHandle = (this._transaction as any).getHandle();
      const count = btck_transaction_count_inputs(txHandle);

      this._cachedLen = Number(count);
    }
    return this._cachedLen;
  }

  /**
     * Fetch a transaction input at a specific normalized offset index.
     *
     * @param index - The non-negative, zero-based sequence position to evaluate.
     * @returns A TransactionInput instance configured as a non-owning memory view linked
     * directly to the parent transaction lifecycle to safely ground the garbage collector.
     * @throws {Error} If `btck_transaction_get_input_at` is unavailable, or if the native
     * pointer extraction fails.
     */
  protected override getItem(index: number): TransactionInput {
    if (!btck_transaction_get_input_at) {
      throw new Error("btck_transaction_get_input_at unavailable");
    }

    const txHandle = (this._transaction as any).getHandle();
    const ptr = btck_transaction_get_input_at(txHandle, BigInt(index)) as bigint;

    if (ptr === 0n) {
      throw new Error(`Failed to retrieve TransactionInput at index ${index}`);
    }

    // Return as a non-owning memory view linked to the parent transaction lifecycle
    return new TransactionInput(ptr, false, this._transaction);
  }
}

/**
 * A lazily-evaluated sequence view over a transaction's outputs.
 *
 * This collection provides random indexed access to individual transaction outputs by
 * fetching records from the native memory array layout on-demand. It acts as an array-like
 * window that caches its computed total element length on first access to drastically
 * minimize FFI boundary crossing overhead during sequential loops or structural evaluation.
 */
export class TransactionOutputSequence extends LazySequence<TransactionOutput> {
  /** * The underlying parent transaction holding the native array handle. */
  private readonly _transaction: Transaction;
  /** * Memoized sequence length storage to avoid redundant C API lookups. */
  private _cachedLen?: number;

  /**
     * Create a sequence view of transaction outputs.
     * * @param transaction - The parent transaction containing the output vector under evaluation.
     */
  constructor(transaction: Transaction) {
    super();
    this._transaction = transaction;
  }

  /**
     * The total number of outputs embedded within the transaction.
     * * The result is requested from the native kernel boundary on the first call
     * and cached internally for subsequent evaluations.
     *
     * @returns The evaluated output array size.
     * @throws {Error} If `btck_transaction_count_outputs` is unavailable.
     */
  override get length(): number {
    if (this._cachedLen === undefined) {
      if (!btck_transaction_count_outputs) {
        throw new Error("btck_transaction_count_outputs unavailable");
      }

      const txHandle = (this._transaction as any).getHandle();
      const count = btck_transaction_count_outputs(txHandle);

      this._cachedLen = Number(count);
    }
    return this._cachedLen;
  }

  /**
     * Fetch a transaction output at a specific normalized offset index.
     *
     * @param index - The non-negative, zero-based sequence position to evaluate.
     * @returns A TransactionOutput instance configured as a non-owning memory view linked
     * directly to the parent transaction lifecycle to safely ground the garbage collector.
     * @throws {Error} If `btck_transaction_get_output_at` is unavailable, or if the native
     * pointer extraction fails.
     */
  protected override getItem(index: number): TransactionOutput {
    if (!btck_transaction_get_output_at) {
      throw new Error("btck_transaction_get_output_at unavailable");
    }

    const txHandle = (this._transaction as any).getHandle();
    const ptr = btck_transaction_get_output_at(txHandle, BigInt(index)) as bigint;

    if (ptr === 0n) {
      throw new Error(`Failed to retrieve TransactionOutput at index ${index}`);
    }

    // Return as a non-owning memory view linked to the parent transaction lifecycle
    return new TransactionOutput(ptr, false, this._transaction);
  }
}

/**
 * High-level wrapper around a native Bitcoin transaction pointer.
 *
 * This class encapsulates a transaction object within the native Bitcoin kernel layer.
 * It provides safe lifecycle management, conversion to/from standard consensus-serialized
 * binary formats, direct read access to transaction metadata (like `locktime` and `txid`),
 * and lazy-loaded collections of its inner components (`inputs` and `outputs`).
 */
export class Transaction extends KernelOpaquePtr {
  protected static override destroyFn = btck_transaction_destroy as (ptr: bigint) => void;
  protected static override copyFn = btck_transaction_copy as (ptr: bigint) => bigint;

  /**
     * Wrap an existing native transaction pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
  /**
     * Parse a brand new native transaction instance from raw consensus-serialized bytes.
     *
     * @param data - The byte buffer containing the transaction serialized in raw Bitcoin consensus network format.
     */
  constructor(data: Uint8Array | Buffer);
  /**
     * Polymorphic implementation handling both direct pointer wrapping and native consensus parsing.
     *
     * @throws {Error} If `btck_transaction_create` is unavailable, or if the native
     * layer fails to parse the provided buffer and returns an invalid null pointer handle.
     */
  constructor(arg1: bigint | Uint8Array | Buffer, arg2?: boolean, arg3: KernelOpaquePtr | null = null) {
    if (arg1 instanceof Uint8Array || Buffer.isBuffer(arg1)) {
      if (!btck_transaction_create) {
        throw new Error("btck_transaction_create unavailable");
      }
      const ptr = btck_transaction_create(arg1, BigInt(arg1.length)) as bigint;
      if (ptr === 0n) {
        throw new Error("Failed to parse native Transaction data");
      }
      super(ptr, true, null);
    } else {
      super(arg1, arg2 ?? true, arg3);
    }
  }

  /**
     * Retrieve the transaction input at a specific zero-based index as a raw pointer view.
     *
     * @param index - The positional index of the requested input.
     * @returns A TransactionInput instance configured as a non-owning dependent memory view.
     * @throws {Error} If `btck_transaction_get_input_at` is unavailable, or if the index is out of bounds.
     */
  protected getInputAt(index: number): TransactionInput {
    if (!btck_transaction_get_input_at) {
      throw new Error("btck_transaction_get_input_at unavailable");
    }
    const ptr = btck_transaction_get_input_at(this.getHandle(), BigInt(index)) as bigint;
    if (ptr === 0n) {
      throw new Error(`Failed to retrieve TransactionInput at index ${index}`);
    }
    return new TransactionInput(ptr, false, this);
  }

  /**
     * Retrieve the transaction output at a specific zero-based index as a raw pointer view.
     *
     * @param index - The positional index of the requested output.
     * @returns A TransactionOutput instance configured as a non-owning dependent memory view.
     * @throws {Error} If `btck_transaction_get_output_at` is unavailable, or if the index is out of bounds.
     */
  protected getOutputAt(index: number): TransactionOutput {
    if (!btck_transaction_get_output_at) {
      throw new Error("btck_transaction_get_output_at unavailable");
    }
    const ptr = btck_transaction_get_output_at(this.getHandle(), BigInt(index)) as bigint;
    if (ptr === 0n) {
      throw new Error(`Failed to retrieve TransactionOutput at index ${index}`);
    }
    return new TransactionOutput(ptr, false, this);
  }

  /**
     * All inputs associated with this transaction.
     *
     * @returns A lazy sequence view over the native inputs array, minimizing memory overhead
     * by fetching individual records from native memory only when evaluated.
     */
  get inputs(): TransactionInputSequence {
    return new TransactionInputSequence(this);
  }

  /**
     * All outputs associated with this transaction.
     *
     * @returns A lazy sequence view over the native outputs array, minimizing memory overhead
     * by fetching individual records from native memory only when evaluated.
     */
  get outputs(): TransactionOutputSequence {
    return new TransactionOutputSequence(this);
  }

  /**
     * The unique transaction identifier (Txid).
     *
     * @returns The computed Txid object instance, instantiated as a dependent non-owning view
     * tied directly to the lifecycle of this transaction wrapper.
     * @throws {Error} If `btck_transaction_get_txid` is unavailable, or if the native
     * layer returns an invalid null pointer handle.
     */
  get txid(): Txid {
    if (!btck_transaction_get_txid) {
      throw new Error("btck_transaction_get_txid unavailable");
    }
    const ptr = btck_transaction_get_txid(this.getHandle()) as bigint;
    if (ptr === 0n) {
      throw new Error("Failed to get Txid pointer from Transaction");
    }
    return new Txid(ptr, false, this);
  }

  /**
     * The absolute or relative locktime threshold (`nLockTime`) value of this transaction.
     *
     * Depending on consensus rules, this value dictates the earliest block height or
     * Unix timestamp threshold below which the transaction cannot be mined into the blockchain.
     *
     * @returns The 32-bit unsigned integer locktime configuration value.
     * @throws {Error} If `btck_transaction_get_locktime` is unavailable.
     */
  get locktime(): number {
    if (!btck_transaction_get_locktime) {
      throw new Error("btck_transaction_get_locktime unavailable");
    }
    return Number(btck_transaction_get_locktime(this.getHandle()));
  }

  /**
     * Serialize the transaction structure back into raw binary bytes.
     *
     * @returns A Uint8Array containing the serialized transaction in standard Bitcoin consensus network format.
     * @throws {Error} If `btck_transaction_to_bytes` is unavailable or the underlying stream breaks.
     */
  toBytes(): Uint8Array {
    if (!btck_transaction_to_bytes) {
      throw new Error("btck_transaction_to_bytes unavailable");
    }

    const writer = new ByteWriter();

    return Uint8Array.from(
      writer.write(
        btck_transaction_to_bytes,
        this.getHandle(),
      ),
    );
  }

  /**
     * Return a string representation of the transaction properties.
     *
     * @returns A diagnostic string listing the big-endian hexadecimal Txid hash string,
     * alongside the aggregate counts of inputs and outputs.
     */
  override toString(): string {
    return `txid=${this.txid.toString()} ins=${this.inputs.length} outs=${this.outputs.length}`;
  }

  /**
     * Create a copy of this Transaction instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * A coin representing a spendable Unspent Transaction Output (UTXO).
 *
 * This class wraps an opaque native pointer to a coin structure extracted from the
 * block validation or index layer. It encapsulates metadata regarding the history
 * of the output, such as its maturity (confirmation height) and whether it originated
 * from a miner reward transaction.
 *
 * * @note Coin instances cannot be directly constructed via the public API.
 * They are obtained downstream from `TransactionSpentOutputs` collections.
 */
export class Coin extends KernelOpaquePtr {
  protected static override destroyFn = btck_coin_destroy as (ptr: bigint) => void;

  protected static override copyFn = btck_coin_copy as (ptr: bigint) => bigint;

  /**
     * Wrap an existing native coin pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) {
    super(ptr, ownsPtr ?? true, parent);
  }

  /**
     * The block height where this coin was mined and committed to the ledger.
     *
     * @returns The zero-based block height index.
     * @throws {Error} If `btck_coin_confirmation_height` is unavailable.
     */
  get confirmationHeight(): number {
    if (!btck_coin_confirmation_height) {
      throw new Error("btck_coin_confirmation_height unavailable");
    }
    return Number(btck_coin_confirmation_height(this.getHandle()));
  }

  /**
     * Indicates whether this coin was generated by a coinbase transaction.
     *
     * This field is vital for validating spending constraints, as coinbase outputs
     * are subject to consensus maturity rules (must achieve 100 confirmations before spending).
     *
     * @returns True if the coin is a miner block reward payout.
     * @throws {Error} If `btck_coin_is_coinbase` is unavailable.
     */
  get isCoinbase(): boolean {
    if (!btck_coin_is_coinbase) {
      throw new Error("btck_coin_is_coinbase unavailable");
    }
    const res = btck_coin_is_coinbase(this.getHandle());
    return res === 1;
  }

  /**
     * The underlying transaction output payload of this coin.
     *
     * @returns A `TransactionOutput` object tracking the numeric satoshi amount and spending script conditions,
     * instantiated as a dependent non-owning view linked directly to the lifecycle of this coin.
     * @throws {Error} If `btck_coin_get_output` is unavailable, or if the native layer returns a null handle.
     */
  get output(): TransactionOutput {
    if (!btck_coin_get_output) {
      throw new Error("btck_coin_get_output unavailable");
    }
    const ptr = btck_coin_get_output(this.getHandle()) as bigint;
    if (ptr === 0n) {
      throw new Error("Failed to get TransactionOutput handle from Coin");
    }
    return new TransactionOutput(ptr, false, this);
  }

  /**
     * Return a string representation of the coin's historical metrics.
     *
     * @returns A diagnostic string capturing the confirmation height, satoshi value, and coinbase status flag.
     */
  override toString(): string {
    return `<Coin height=${this.confirmationHeight} amount=${this.output.amount} coinbase=${this.isCoinbase}>`;
  }

  /**
     * Create a copy of this Coin instance.
     *
     * @returns A new instance pointing to a duplicated native coin handle.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * A lazily-evaluated sequence view over the coins spent by a transaction.
 *
 * This collection implements an iterable window providing random indexed access to
 * individual consumed coins. By memoizing total counts and pulling pointers from native
 * layouts on-demand, it protects execution context loops against repetitive, costly FFI bindings.
 */
export class CoinSequence implements Iterable<Coin> {
  /** * The underlying collection structure managing the native spent outputs array tracking context. */
  private _spentOutputs: TransactionSpentOutputs;
  /** * Memoized collection size storage to optimize sequence loop calculations. */
  private _cachedLen?: number;

  /**
     * Create a sequence view tracking spent coins.
     *
     * @param spentOutputs - The parent collection managing the underlying native data array.
     */
  constructor(spentOutputs: TransactionSpentOutputs) {
    this._spentOutputs = spentOutputs;
  }

  /**
     * The total number of coins spent within the target transaction context.
     * * Requested from the native library boundary on the first call and cached for subsequent evaluations.
     *
     * @returns The evaluated array size integer.
     * @throws {Error} If `btck_transaction_spent_outputs_count` is unavailable.
     */
  get length(): number {
    if (this._cachedLen === undefined) {
      if (!btck_transaction_spent_outputs_count) {
        throw new Error("btck_transaction_spent_outputs_count unavailable");
      }
      // Safely pulling handle through external class boundaries
      const handle = (this._spentOutputs as any).getHandle();
      this._cachedLen = Number(btck_transaction_spent_outputs_count(handle));
    }
    return this._cachedLen;
  }

  /**
     * Retrieve a coin element located at a specific positional offset.
     *
     * @param index - The zero-based index position to evaluate.
     * @returns A `Coin` instance configured as a non-owning view bound to the parent tracking structure.
     * @throws {RangeError} If the index argument drops below 0 or goes out of bounds.
     * @throws {Error} If the native FFI function bindings are missing or pointer extraction fails.
     */
  get(index: number): Coin {
    if (index < 0 || index >= this.length) {
      throw new RangeError(`Index out of bounds: ${index}`);
    }
    if (!btck_transaction_spent_outputs_get_coin_at) {
      throw new Error("btck_transaction_spent_outputs_get_coin_at unavailable");
    }
    const handle = (this._spentOutputs as any).getHandle();
    const ptr = btck_transaction_spent_outputs_get_coin_at(handle, BigInt(index)) as bigint;
    if (ptr === 0n) {
      throw new Error(`Failed to retrieve Coin at index ${index}`);
    }
    return new Coin(ptr, false, this._spentOutputs);
  }

  /**
     * Built-in iterator engine mapping sequence instances to standard JavaScript looping structures.
     *
     * Enables integration with `for...of` iteration loops, the spread operator (`[...sequence]`),
     * and array destructuring syntax. Elements are evaluated and hydrated sequentially.
     *
     * @returns A generator iterator over individual spent coins.
     */
  *[Symbol.iterator](): Iterator<Coin> {
    const len = this.length;
    for (let i = 0; i < len; i++) {
      yield this.get(i);
    }
  }
}

/**
 * Collection wrapper tracking the specific set of coins consumed by a transaction's inputs.
 *
 * This class maps the explicit UTXOs being claimed and cleared by the transaction validation execution vector.
 * It manages an aggregate sequence array of entries ordered symmetrically with the target transaction's inputs.
 *
 * * @note TransactionSpentOutputs instances cannot be directly constructed via the public API.
 * They are obtained downstream from broader `BlockSpentOutputs` tracking blocks.
 */
export class TransactionSpentOutputs extends KernelOpaquePtr {
  protected static override destroyFn = btck_transaction_spent_outputs_destroy as (ptr: bigint) => void;

  protected static override copyFn = btck_transaction_spent_outputs_copy as (ptr: bigint) => bigint;

  /**
     * Wrap an existing native spent outputs collection pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) {
    super(ptr, ownsPtr ?? true, parent);
  }

  /**
     * Lower-level retrieval hook to pull a single coin address at a specific offset.
     *
     * @param index - The zero-based array index position to evaluate.
     * @returns A Coin instance configured as a non-owning view linked to this collection wrapper.
     * @throws {Error} If `btck_transaction_spent_outputs_get_coin_at` is unavailable, or if the pointer resolves to null.
     */
  protected getCoinAt(index: number): Coin {
    if (!btck_transaction_spent_outputs_get_coin_at) {
      throw new Error("btck_transaction_spent_outputs_get_coin_at unavailable");
    }
    const ptr = btck_transaction_spent_outputs_get_coin_at(this.getHandle(), BigInt(index)) as bigint;
    if (ptr === 0n) {
      throw new Error(`Failed to retrieve Coin at index ${index}`);
    }
    return new Coin(ptr, false, this);
  }

  /**
     * All historical spent coins associated with this transaction execution vector.
     *
     * @returns A lazy `CoinSequence` helper mapping elements relative to their matching transaction input index.
     */
  get coins(): CoinSequence {
    return new CoinSequence(this);
  }

  /**
     * Return a string representation of the spent outputs collection properties.
     *
     * @returns A descriptive string capturing the aggregate count of elements within the sequence.
     */
  override toString(): string {
    return `<TransactionSpentOutputs coins=${this.coins.length}>`;
  }

  /**
     * Create a copy of this TransactionSpentOutputs instance.
     *
     * @returns A new instance pointing to a duplicated native array collection handle.
     */
  override copy(): this {
    return super.copy();
  }
}