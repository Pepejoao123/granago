# 🐷 GranaGo — controle financeiro

App de finanças pessoais (Android + PC/navegador) no mesmo modelo do FitPro: HTML/JS puro empacotado com **Capacitor**, e o **GitHub Actions gera o APK sozinho a cada commit**.

## O que ele faz
- **Lançamentos** de despesas e receitas: valor, descrição, categoria, data, forma de pagamento (Pix, crédito, débito, dinheiro, boleto) e observação.
- **Bancos com identidade visual**: Nubank, Itaú, Bradesco, Santander, BB, Caixa, Inter, C6, PicPay, Mercado Pago, XP, BTG, Next, Neon, Sicredi, Sicoob, PagBank, Will, Original ou personalizado. Dá para trocar as cores e o estilo do cartão (degradê, sólido, metálico, pontilhado, onda).
- **Cartões de crédito** em cada banco: limite, dia de fechamento, dia de vencimento, bandeira e final. O app mostra a fatura atual, o limite usado e o disponível, as compras parceladas (até 24x) distribuídas nas faturas e o botão "marcar como paga", que libera o limite.
- **Gráficos**: rosca por categoria (despesas ou receitas), barras dos últimos 6 meses, gastos por forma de pagamento e por cartão/banco.
- **Categorias** editáveis, com emoji, cor e palavras-chave.
- **Lançar por mensagem, áudio ou foto**:
  - *Mensagem*: "gastei 42,90 no iFood no Nubank", "uber 23,50 no pix e mercado 150 no débito do Itaú", "tênis 600 em 3x no cartão do Itaú", "recebi 2500 de salário".
  - *Áudio*: usa o reconhecimento de voz do Android, que funciona sem chave; ou grava o áudio e manda para a IA.
  - *Foto da nota, cupom ou comprovante de Pix* (câmera ou galeria, aceita PDF): a IA lê o total, o estabelecimento, a data e a forma de pagamento.
  - Você sempre confere antes de salvar. Quando há vários gastos, abre uma tela de revisão.
  - Sem chave de IA, mensagem e voz usam um interpretador local (offline). A foto precisa da IA.
- Backup (exportar/importar JSON), tema AMOLED preto, botão voltar do Android fecha as janelas, funciona offline.

## Subir para o GitHub (pelo site)
1. Crie o repositório **granago** em github.com/new. Ele pode ser público ou privado; o Pages grátis exige público.
2. Extraia o zip, abra a pasta, aperte **Ctrl+A** e **arraste tudo** para *Add file → Upload files*. Confira se a pasta **`.github`** subiu.
3. **Settings → Secrets and variables → Actions → New repository secret**:
   - `GEMINI_API_KEY`: a mesma chave do Gemini que você usa no FitPro (aistudio.google.com).
   - `ANDROID_DEBUG_KEYSTORE` (opcional, recomendado): mesmo valor do FitPro. Mantém a assinatura fixa, para o app atualizar sem precisar desinstalar.
4. **Settings → Pages → Source: GitHub Actions** (versão web para o PC).
5. Pronto: **qualquer arquivo modificado na branch `main` dispara o build**. Também dá para rodar na mão em *Actions → Build APK → Run workflow*.

## Baixar o APK
- Link fixo, sempre com a versão mais nova: `https://github.com/SEU_USUARIO/granago/releases/latest/download/GranaGo.apk`
- Ou em *Actions → execução → Artifacts → GranaGo-apk*.
- Versão web: `https://SEU_USUARIO.github.io/granago/`

> Atenção: no GitHub Pages, a chave da IA vai junto no `config.js`, que é público. Restrinja a chave no Google AI Studio/Cloud, ou deixe o secret vazio e informe a chave em **Ajustes** dentro do app.

## Estrutura
```
.github/workflows/build-apk.yml   build do APK + Release "latest" + GitHub Pages
assets/                           ícone (cofrinho branco no fundo preto) e splash
scripts/patch-android.js          permissões de câmera e microfone + reconhecimento de voz
www/index.html  style.css  app.js manifest.webmanifest  sw.js  icons/
tools/pig.svg                     desenho-fonte do ícone
capacitor.config.json  package.json
```

## Como funcionam as faturas
Compra feita **no dia do fechamento ou depois** entra na fatura seguinte. A fatura é nomeada pelo **mês do vencimento**. Em **Ajustes** você escolhe se as compras no crédito contam nos gráficos e no saldo pelo **mês da compra** ou pelo **mês da fatura**.
