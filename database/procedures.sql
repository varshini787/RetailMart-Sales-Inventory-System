DELIMITER //

CREATE PROCEDURE GetCustomerOrders(IN customerId INT)
BEGIN
    SELECT
        o.order_id,
        o.order_date,
        o.total_amount,
        o.status
    FROM Orders o
    WHERE o.customer_id = customerId;
END //

DELIMITER ;