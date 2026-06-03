
/**
 * Script verification flags that may be composed with each other.
 *
 * These flags control which validation rules are enforced during script
 * verification. Multiple flags can be combined using bitwise OR operations.
 */
export enum ScriptVerificationFlags {
    NONE = 0, // No verification flags
    P2SH = 1 << 0, // Evaluate P2SH subscripts (BIP16)
    DERSIG = 1 << 2, // Enforce strict DER signature encoding (BIP66) 
    NULLDUMMY = 1 << 4, // Enforce NULLDUMMY rule (BIP147)
    CHECKLOCKTIMEVERIFY = 1 << 9, // Enable CHECKLOCKTIMEVERIFY opcode (BIP65) 
    CHECKSEQUENCEVERIFY = 1 << 10, // Enable CHECKSEQUENCEVERIFY opcode (BIP112)
    WITNESS = 1 << 11, // Enable Segregated Witness (BIP141)
    TAPROOT = 1 << 17, // Enable Taproot (BIP341 & BIP342) 

    /** All verification flags combined */
    ALL = P2SH |
        DERSIG |
        NULLDUMMY |
        CHECKLOCKTIMEVERIFY |
        CHECKSEQUENCEVERIFY |
        WITNESS |
        TAPROOT
}

/**
 * Status codes returned by script verification.
 *
 * These codes indicate the result of script verification, including
 * success, various error conditions, and validation failures.
 */
export enum ScriptVerifyStatus {
    OK = 0, // Verification succeeded
    ERROR_INVALID_FLAGS_COMBINATION = 1, // The verification flags were combined in an invalid way 
    ERROR_SPENT_OUTPUTS_REQUIRED = 2 // The taproot flag requires valid spent outputs to be provided 
}
