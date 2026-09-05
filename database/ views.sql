CREATE VIEW ProductInventoryStatus AS
SELECT
    p.product_id,
    p.product_name,
    p.sku,
    s.store_name,
    i.quantity,
    i.reorder_level,
    CASE
        WHEN i.quantity = 0 THEN 'Out of Stock'
        WHEN i.quantity <= i.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status
FROM Products p
JOIN Inventory i
    ON p.product_id = i.product_id
JOIN Stores s
    ON i.store_id = s.store_id;