import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Sale } from '@/types/database'

export function printSaleInvoice(sale: Sale) {
  // Cria a div de impressão
  const printDiv = document.createElement('div')
  printDiv.id = 'sale-print-area'
  
  // Formatadores
  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return '-'
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch (err) {
      console.error('Erro ao formatar data de venda:', dateStr, err)
      return '-'
    }
  }

  const clientName = sale.client?.name || sale.client_name_free || 'Cliente não identificado'
  const clientPhone = sale.client?.phone || '-'
  const sellerName = sale.users_profiles?.name || 'Não informado'
  
  const paymentMethodLabel = sale.payment_method ? {
    dinheiro: 'Dinheiro',
    pix: 'Pix',
    cartao_debito: 'Cartão de Débito',
    cartao_credito: 'Cartão de Crédito'
  }[sale.payment_method] : 'Não informado'

  const itemsHTML = sale.items.map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 0; font-size: 13px; color: #1e293b;">
        <span style="font-weight: bold; display: block;">${item.name}</span>
      </td>
      <td style="padding: 10px 0; text-align: center; font-size: 13px; color: #475569;">
        ${item.quantity}
      </td>
      <td style="padding: 10px 0; text-align: right; font-size: 13px; color: #475569;">
        ${formatCurrency(item.unit_price)}
      </td>
      <td style="padding: 10px 0; text-align: right; font-size: 13px; font-weight: bold; color: #1e293b;">
        ${formatCurrency(item.total)}
      </td>
    </tr>
  `).join('')

  const singleInvoiceHTML = (viaTitle: string) => `
    <div class="invoice-via" style="height: 138mm; box-sizing: border-box; padding: 8mm; display: flex; flex-direction: column; justify-content: space-between; position: relative; font-family: 'Inter', sans-serif;">
      <div>
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #581c87; padding-bottom: 8px; margin-bottom: 12px;">
          <div>
            <h1 style="font-size: 22px; font-weight: 900; color: #581c87; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Oficina da Roupa</h1>
            <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0; font-weight: 500;">Moda & Costura sob medida</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 10px; font-weight: bold; background-color: #f3e8ff; color: #581c87; padding: 4px 8px; border-radius: 9999px; text-transform: uppercase;">${viaTitle}</span>
            <p style="font-size: 12px; font-weight: bold; margin: 8px 0 0 0; color: #1e293b;">CUPOM: #${sale.id.substring(0, 8).toUpperCase()}</p>
            <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">${formatDate(sale.sale_date)}</p>
          </div>
        </div>

        <!-- Informações da Venda -->
        <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 15px; margin-bottom: 15px; font-size: 12px; color: #334155; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
          <div>
            <p style="margin: 0 0 4px 0;"><strong>Cliente:</strong> ${clientName}</p>
            <p style="margin: 0;"><strong>Telefone:</strong> ${clientPhone}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0 0 4px 0;"><strong>Vendedor:</strong> ${sellerName}</p>
            <p style="margin: 0;"><strong>Pagamento:</strong> ${paymentMethodLabel}</p>
          </div>
        </div>

        <!-- Tabela de Produtos -->
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">
              <th style="padding-bottom: 6px;">Produto / Item</th>
              <th style="padding-bottom: 6px; text-align: center; width: 50px;">Qtd</th>
              <th style="padding-bottom: 6px; text-align: right; width: 90px;">Unitário</th>
              <th style="padding-bottom: 6px; text-align: right; width: 90px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>

      <!-- Totais e Rodapé -->
      <div>
        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <div style="width: 220px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: #64748b;">
              <span>Subtotal:</span>
              <span>${formatCurrency(sale.subtotal || 0)}</span>
            </div>
            ${sale.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: #ef4444; font-weight: 500;">
                <span>Desconto:</span>
                <span>-${formatCurrency(sale.discount)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 5px; color: #581c87; margin-top: 5px;">
              <span>TOTAL PAGO:</span>
              <span>${formatCurrency(sale.total || 0)}</span>
            </div>
          </div>
        </div>

        <!-- Assinatura/Rodapé de agradecimento -->
        <div style="display: flex; justify-content: space-between; align-items: end; font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 8px;">
          <span>Obrigado pela preferência! Volte sempre.</span>
          <div style="width: 140px; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 2px; font-weight: 500; color: #64748b;">
            Assinatura Cliente
          </div>
        </div>
      </div>
    </div>
  `

  printDiv.innerHTML = `
    <div style="width: 210mm; height: 297mm; padding: 4mm 0; margin: 0; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      <!-- Via Estabelecimento -->
      ${singleInvoiceHTML('Via Estabelecimento')}
      
      <!-- Linha de Corte -->
      <div style="height: 0; border-top: 1.5px dashed #a1a1aa; width: 100%; position: relative; text-align: center; margin: 2mm 0;">
        <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 10px; font-size: 11px; color: #71717a; font-weight: bold; font-family: sans-serif;">
          ✂ CORTE AQUI
        </span>
      </div>

      <!-- Via Cliente -->
      ${singleInvoiceHTML('Via do Cliente')}
    </div>
  `

  document.body.appendChild(printDiv)
  
  // Dispara a impressão
  window.print()
  
  // Limpa o DOM
  document.body.removeChild(printDiv)
}
