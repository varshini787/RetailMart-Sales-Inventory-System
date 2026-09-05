DELIMITER //

CREATE TRIGGER after_order_item_insert
AFTER INSERT ON OrderItems
FOR EACH ROW
BEGIN
    UPDATE Inventory
    SET quantity = quantity - NEW.quantity
    WHERE product_id = NEW.product_id
      AND store_id = (
          SELECT store_id
          FROM Orders
          WHERE order_id = NEW.order_id
      );
END //

DELIMITER ;