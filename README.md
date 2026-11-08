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
- **Temas** (Ajustes → Aparência): Escuro AMOLED (padrão), Claro, Liquid Glass claro e Liquid Glass escuro, ou "seguir o sistema". Cada aparelho guarda a sua escolha.
- **Lembretes** (Ajustes → Lembretes): notificação às **12:00** e no **fim do dia (21:00)** para lançar os gastos, com horários editáveis. A notificação da noite mostra quanto você já lançou hoje. Os botões **💬 Escrever / 🎙️ Falar / 📷 Nota** já abrem o lançamento. Opção "pular se eu já lancei" no período.
- **Widgets da tela inicial** (APK): **Saldo do mês**, **Gastos de hoje** e **Cartão** (fatura atual, vencimento e limite; o botão › troca de cartão). Os botões do widget abrem o app direto no lançamento manual, mensagem, áudio ou câmera. São 3 temas (Escuro, Liquid Glass e Glass claro) e o tamanho vai de 2x2 para cima.
- **Planilha Google como banco de dados** (Ajustes → Planilha Google): veja abaixo.
- Backup (exportar/importar JSON), botão voltar do Android fecha as janelas, funciona offline.

## Planilha Google como banco de dados
O app continua salvando no aparelho (funciona offline) e sincroniza com uma planilha sua: celular e PC ficam iguais, e a planilha passa a ser a cópia central dos dados.
1. Crie uma planilha (sheets.new) → **Extensões → Apps Script** → cole o código de [`www/apps-script/Code.gs`](www/apps-script/Code.gs) (no app: Ajustes → Planilha Google → **Copiar código**) → Salvar.
2. **Implantar → Nova implantação → App da Web** · Executar como: **Eu** · Quem pode acessar: **Qualquer pessoa** → autorize.
3. Cole a URL do app da Web (termina em `/exec`) no GranaGo, no celular e no PC.

São criadas as abas **Lançamentos, Bancos, Cartões e Categorias**. Você pode editar valores, descrições e categorias, apagar linhas ou digitar linhas novas direto na planilha; na próxima sincronização o app atualiza. Em conflito vence a alteração mais recente, e a coluna "Atualizado em" é preenchida sozinha quando você edita. As colunas de id ficam ocultas no fim. A aba oculta `_granago` guarda os dados técnicos. A sincronização acontece ao abrir o app, alguns segundos depois de cada alteração e a cada 2 minutos com o app aberto.
- A URL do script funciona como senha: não compartilhe. Se quiser mais segurança, preencha `SENHA` no código e a mesma senha no app.
- A chave da IA não vai para a planilha.
- Para atualizar o código sem trocar a URL: Implantar → Gerenciar implantações → lápis → Versão: **Nova versão**.

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
scripts/patch-android.js          permissões, ícone das notificações e widgets (layouts × 3 temas, registros no manifest)
native/                           código Java dos widgets (GranaWidgets, Month/Today/CardWidget, plugin GranaWidget, MainActivity)
www/index.html  style.css  app.js manifest.webmanifest  sw.js  icons/
www/apps-script/Code.gs           Apps Script da planilha (banco de dados)
tools/pig.svg                     desenho-fonte do ícone
capacitor.config.json  package.json
```

## Como funcionam as faturas
Compra feita **no dia do fechamento ou depois** entra na fatura seguinte. A fatura é nomeada pelo **mês do vencimento**. Em **Ajustes** você escolhe se as compras no crédito contam nos gráficos e no saldo pelo **mês da compra** ou pelo **mês da fatura**.
