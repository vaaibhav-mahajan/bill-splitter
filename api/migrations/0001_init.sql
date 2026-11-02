
-- 1. HOMES

CREATE TABLE homes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);


-- 2. MEMBERS

CREATE TABLE members (
    id TEXT PRIMARY KEY,
    home_id TEXT NOT NULL,
    name TEXT NOT NULL,
    member_order INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_member_home
        FOREIGN KEY (home_id)
        REFERENCES homes(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_home_member_order
        UNIQUE (home_id, member_order),

    CONSTRAINT uq_home_member_id
        UNIQUE (home_id, id)
);


-- 3. BILLS

CREATE TABLE bills (
    id TEXT PRIMARY KEY,
    home_id TEXT NOT NULL,
    title TEXT NOT NULL,
    total_cents INTEGER NOT NULL,

    CONSTRAINT fk_bill_home
        FOREIGN KEY (home_id)
        REFERENCES homes(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_positive_total
        CHECK (
            typeof(total_cents) = 'integer'
            AND total_cents > 0
        ),

    CONSTRAINT uq_home_bill_id
        UNIQUE (home_id, id)
);


-- 4. SHARES

CREATE TABLE shares (
    id TEXT PRIMARY KEY,
    home_id TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    paid_at TEXT,
    idempotency_key TEXT,

    CONSTRAINT fk_share_bill
        FOREIGN KEY (home_id, bill_id)
        REFERENCES bills(home_id, id)
        ON DELETE CASCADE,

    CONSTRAINT fk_share_member
        FOREIGN KEY (home_id, member_id)
        REFERENCES members(home_id, id)
        ON DELETE CASCADE,

    CONSTRAINT chk_share_amount
        CHECK (
            typeof(amount_cents) = 'integer'
            AND amount_cents >= 0
        ),

    CONSTRAINT uq_bill_member
        UNIQUE (bill_id, member_id),

    CONSTRAINT uq_share_idempotency
        UNIQUE (idempotency_key),

    CONSTRAINT chk_payment_state
        CHECK (
            (paid_at IS NULL AND idempotency_key IS NULL)
            OR
            (paid_at IS NOT NULL AND idempotency_key IS NOT NULL)
        )
);


-- 5. INDEXES

CREATE INDEX idx_members_home_order
    ON members(home_id, member_order);

CREATE INDEX idx_bills_home
    ON bills(home_id);

CREATE INDEX idx_shares_member_paid
    ON shares(member_id, paid_at);
