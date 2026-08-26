function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <h3 className="font-medium">{title}</h3>
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">
        {children}
      </div>
    </div>
  );
}

export function DocumentacionTab() {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Tienda abierta / cerrada">
        <p>
          El switch del panel superior (arriba a la derecha, en todas las páginas del admin) apaga
          la tienda entera — los clientes ven un cartel de &quot;Tienda cerrada&quot; y no se puede
          hacer ningún pedido, sea cual sea el modo de fechas o los horarios configurados. Usalo
          para vacaciones, un problema puntual, o cualquier corte manual que no dependa del
          calendario.
        </p>
      </Section>

      <Section title="Fechas y stock">
        <p>
          <b>Horario semanal:</b> la tienda toma pedidos solo dentro de ventanas horarias fijas por
          día (ej. lunes 9 a 18hs). Se configura en Fechas y stock → Modalidad.
        </p>
        <p>
          <b>Ventas programadas:</b> vos abrís fechas puntuales (ej. &quot;sábado 14&quot;) con su
          propio horario de corte y capacidad — la tienda solo vende para esas fechas mientras
          estén abiertas.
        </p>
        <p>
          <b>Stock:</b> se puede trackear por grupo (varios productos comparten un mismo pozo, ej.
          distintos sabores de la misma torta), por producto (cada uno con su propio número), o sin
          límite. Se define por producto en su ficha, y por fecha en Fechas y stock.
        </p>
      </Section>

      <Section title="Pedidos">
        <p>
          Flujo normal: <b>Pendiente de pago</b> (solo transferencia, hasta que revisás el
          comprobante) → <b>Confirmado</b> → <b>Preparando</b> → <b>Listo</b> →{" "}
          <b>Entregado</b>. Un pedido en efectivo entra directo como Confirmado.
        </p>
        <p>
          Cancelar un pedido devuelve el stock descontado y revierte los puntos que hubiera sumado
          — no hace falta ajustar nada a mano.
        </p>
      </Section>

      <Section title="Puntos y cupones">
        <p>
          Los clientes logueados suman puntos automáticamente al confirmarse un pedido (tasa
          configurable en Puntos). Los canjean por cupones desde &quot;Mis puntos&quot; — un cupón
          con costo en puntos no se puede usar tipeando el código directo, primero hay que
          canjearlo.
        </p>
        <p>Un cupón sin costo en puntos funciona como descuento normal, con el código en el checkout.</p>
      </Section>

      <Section title="Productos a consultar por WhatsApp">
        <p>
          Activando &quot;Consultar por WhatsApp&quot; en la ficha de un producto (catering,
          encargos grandes, etc.), se oculta el precio y el carrito — el cliente ve un botón que le
          arma un mensaje de WhatsApp precargado con el nombre del producto. Nunca se puede pedir
          por el checkout normal.
        </p>
      </Section>

      <Section title="Usuarios">
        <p>
          Desde Usuarios se puede ver el historial de compras de cualquier cliente, cambiarle el rol
          entre Cliente y Admin, o borrarlo. Un usuario con pedidos asociados no se puede borrar —
          hay que dejarlo así para no perder ese historial.
        </p>
      </Section>

      <Section title="Mail de confirmación">
        <p>
          Se manda solo si hay SMTP cargado (pestaña &quot;Mail&quot;, acá al lado). Sin eso
          configurado, la tienda funciona igual, simplemente no llega ese mail.
        </p>
      </Section>
    </div>
  );
}
