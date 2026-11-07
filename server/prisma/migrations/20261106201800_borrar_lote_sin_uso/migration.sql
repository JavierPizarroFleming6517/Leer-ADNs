-- Permite borrar los eventos de fabricación solo dentro de la transacción
-- que elimina un lote que todavía no tiene registros asociados.
CREATE OR REPLACE FUNCTION custodia_solo_insercion() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('trazagen.borrar_lote', true) = '1' THEN
    IF TG_LEVEL = 'ROW' THEN
      RETURN OLD;
    END IF;
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'La cadena de custodia es de solo inserción: % no está permitido sobre EventoCustodia', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
