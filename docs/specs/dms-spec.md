# Especificação - Document Management System

## 1. Objetivo

Oferecer a um usuário local uma aplicação web simples para enviar, listar e baixar documentos armazenados no filesystem da aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos enviados durante a execução atual do backend.
- Download de um documento pelo identificador.
- Associação dos documentos a um identificador de usuário configurado para a instância.
- Interface web para executar os fluxos de upload, listagem e download.
- Validação de entrada e respostas de erro consistentes.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Persistência durável dos metadados ou recuperação do catálogo após reinício.
- Cadastro, login, autenticação ou autorização multiusuário.
- Pesquisa, filtros e paginação.
- Pré-visualização, conversão ou processamento do conteúdo dos arquivos.

### Premissas do MVP

- A aplicação atende um único usuário lógico por instância. O identificador do dono é configurado no ambiente; não é uma credencial nem mecanismo de autenticação.
- Todas as rotas de documentos operam sobre o catálogo dessa instância. Não há isolamento de dados entre usuários.
- O frontend usa o prefixo `/api` fornecido pelo proxy de desenvolvimento; o backend mantém as rotas sem esse prefixo.
- Os requisitos abaixo definem o comportamento esperado e não indicam que os fluxos já estejam implementados.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento usando `multipart/form-data` com um único campo de arquivo chamado `file`. | Uma requisição válida armazena os bytes localmente e retorna `201` com os metadados do documento. |
| RF-02 | O sistema valida o arquivo recebido antes de registrá-lo. | Campo ausente, arquivo vazio, campos de arquivo adicionais ou arquivo acima do limite são rejeitados sem criar metadados. |
| RF-03 | O sistema atribui ao documento um identificador único e um nome físico gerado pelo sistema. | O nome original não é usado como caminho ou nome físico no filesystem. |
| RF-04 | O sistema registra os metadados do documento em memória após o armazenamento do arquivo. | O registro contém identificador, nome original, tamanho em bytes, data/hora de upload e dono. |
| RF-05 | O usuário pode listar os documentos da instância. | A resposta contém os metadados disponíveis, ordenados do mais recente para o mais antigo; empates são ordenados pelo identificador. Uma instância sem registros retorna lista vazia. |
| RF-06 | O usuário pode baixar um documento existente por identificador. | A resposta contém os bytes originais como anexo e usa o nome original de forma segura no cabeçalho de download. |
| RF-07 | O sistema informa erros de entrada, documento inexistente e falhas de armazenamento por respostas HTTP e códigos de erro estáveis. | As respostas não expõem caminhos locais, stack traces ou detalhes internos do filesystem. |
| RF-08 | A interface permite selecionar e enviar um arquivo, consultar a lista e iniciar o download de um documento. | A interface apresenta estado de carregamento e mensagens compreensíveis de sucesso ou falha, sem exibir detalhes internos do servidor. |
| RF-09 | Após reiniciar o backend, o catálogo em memória começa vazio. | A listagem retorna uma lista vazia até novos uploads; arquivos remanescentes no disco não são considerados documentos listáveis sem metadados. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local da aplicação em `backend/storage`, usando Multer com `diskStorage`. Não são permitidos provedores de armazenamento externos. |
| RNF-02 | Os metadados são mantidos em memória nesta fase; sua perda após reinício é uma limitação esperada do MVP. |
| RNF-03 | Configurações operacionais são obtidas por variáveis de ambiente, respeitando o princípio 12-Factor. A porta usa `PORT` (padrão `3000`), o dono usa `DMS_OWNER_ID` (padrão `local-user`) e o limite de upload usa `DMS_MAX_FILE_SIZE_BYTES` (padrão `10485760`, equivalente a 10 MiB). |
| RNF-04 | O limite de tamanho é aplicado no recebimento do multipart, antes de o arquivo ser aceito. Valor ausente usa o padrão; valor não inteiro ou não positivo impede a inicialização com mensagem clara. |
| RNF-05 | Não há lista de extensões ou tipos MIME permitidos no MVP. O servidor não confia no nome ou no tipo MIME informado pelo cliente para decidir o caminho de armazenamento ou interpretar o conteúdo. Downloads são enviados como `application/octet-stream` e `Content-Disposition: attachment`. |
| RNF-06 | O identificador e o nome físico do arquivo são gerados no servidor. O nome original é preservado apenas como metadado de apresentação, sem componentes de caminho, e deve ser codificado com segurança ao compor o cabeçalho de download. |
| RNF-07 | Falhas de persistência não devem deixar um documento anunciado no catálogo sem arquivo correspondente. Se o registro em memória falhar após a gravação, o arquivo recém-criado deve ser removido quando possível. |
| RNF-08 | A API usa JSON para respostas de sucesso que contêm metadados e para erros. O conteúdo do download é binário. |
| RNF-09 | O projeto usa Node.js e Express em CommonJS, React e Vite em ESM, JavaScript sem TypeScript e testes backend com `node:test`. |
| RNF-10 | A falta de autenticação limita o uso a um ambiente local ou controlado. A aplicação não deve ser apresentada como adequada para dados multiusuário ou exposta como serviço público sem uma especificação posterior de autenticação e autorização. |

## 5. Modelo de dados (metadados do documento)

O catálogo em memória contém um registro por documento. A implementação pode usar uma estrutura em memória adequada, como um mapa indexado por `id`.

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | API e interno | Identificador único, opaco e gerado pelo servidor. UUID é o formato recomendado. |
| `originalName` | string | API e interno | Nome original para exibição e para o nome sugerido no download. Não deve ser interpretado como caminho. |
| `size` | number | API e interno | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string | API e interno | Data/hora UTC em formato ISO 8601. |
| `owner` | string | API e interno | Valor de `DMS_OWNER_ID` para a instância. Identifica o usuário lógico local, mas não comprova identidade. |
| `storageKey` | string | Somente interno | Nome gerado pelo servidor para localizar o arquivo dentro de `backend/storage`. Nunca é retornado pela API. |

O arquivo armazenado contém exatamente os bytes recebidos. `storageKey` não deve ser derivado de `originalName`; nenhum caminho absoluto é exposto ao cliente. O catálogo não precisa persistir os metadados em disco. Arquivos remanescentes de execuções anteriores podem existir sem registro correspondente e não são incluídos na listagem.

## 6. Contratos de API

### Formato de erro

Erros de API seguem o formato abaixo. `message` é uma mensagem segura para apresentação ou registro no cliente; detalhes internos permanecem no servidor.

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

### POST /upload

- Entrada: `multipart/form-data` com exatamente um arquivo no campo `file`.
- Limite: `DMS_MAX_FILE_SIZE_BYTES`, padrão de 10 MiB.
- Não há filtro por extensão ou tipo MIME no MVP.
- Sucesso: `201 Created`, `Content-Type: application/json`.

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-11-11T12:00:00.000Z",
    "owner": "local-user"
  }
}
```

Erros esperados:

| HTTP | Código | Situação |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente. |
| `400` | `EMPTY_FILE` | Arquivo com zero bytes. |
| `400` | `UNEXPECTED_FILE` | Campo de arquivo diferente de `file` ou mais de um arquivo. |
| `413` | `FILE_TOO_LARGE` | Arquivo excede o limite configurado. |
| `500` | `STORAGE_WRITE_FAILED` | Falha ao gravar o arquivo localmente. |

### GET /documents

- Entrada: sem corpo ou parâmetros de consulta.
- Sucesso: `200 OK`, `Content-Type: application/json`.
- A lista contém apenas os registros em memória da instância atual, ordenados por `uploadedAt` decrescente e, em caso de empate, por `id` crescente.

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-11-11T12:00:00.000Z",
      "owner": "local-user"
    }
  ]
}
```

Quando não houver documentos, retorna `200` com `{"documents": []}`.

### GET /documents/:id/download

- Entrada: identificador do documento no segmento `:id`.
- Sucesso: `200 OK`, corpo binário, `Content-Type: application/octet-stream` e `Content-Disposition: attachment` com o nome original codificado com segurança.
- O caminho físico é resolvido a partir do `storageKey` interno e confinado ao diretório local de armazenamento.

Erros esperados:

| HTTP | Código | Situação |
| --- | --- | --- |
| `404` | `DOCUMENT_NOT_FOUND` | Não existe metadado com o identificador solicitado. |
| `500` | `STORAGE_READ_FAILED` | Há metadado, mas o arquivo não pode ser lido. A resposta não revela o caminho ou a causa interna. |

### Prefixo usado pelo frontend

O frontend chama os caminhos equivalentes com `/api`, por exemplo `POST /api/upload` e `GET /api/documents`. O proxy do Vite remove esse prefixo antes de encaminhar a requisição ao backend. Os caminhos públicos do backend permanecem os descritos nesta seção.

## 7. Decisões arquiteturais

- Backend em Node.js e Express, organizado em `routes`, `controllers`, `services` e `repositories`, com dependências no sentido `routes -> controllers -> services -> repositories`.
- Rotas encaminham requisições; controllers validam a entrada HTTP e constroem respostas; services concentram regras do upload, listagem e download; repositories controlam o catálogo em memória e o acesso ao armazenamento local conforme necessário.
- Upload usa Multer com `diskStorage`. O destino é `backend/storage`; nomes físicos são gerados pelo servidor e não usam o nome original enviado pelo cliente.
- Metadados permanecem em memória. A gravação do arquivo é durável no filesystem, mas o catálogo não sobrevive ao reinício; essa diferença pode deixar arquivos órfãos e deve ser aceita nesta fase.
- A identidade é única por instância e vem de `DMS_OWNER_ID`. Não existe autenticação nem garantia de isolamento de acesso; não se deve aceitar um owner livremente enviado pelo cliente como controle de autorização.
- Frontend em React com componentes funcionais e Hooks, organizado por componentes, páginas e serviços. A comunicação com o backend usa `fetch` pelo prefixo `/api` do proxy Vite.
- Mensagens apresentadas ao usuário são em português; nomes de símbolos de código são em inglês. Erros são tratados nos limites HTTP e de leitura/escrita de arquivos.
- Sem banco de dados, armazenamento remoto ou dependências de infraestrutura adicionais no MVP.

## 8. Plano de execução

As etapas abaixo descrevem capacidades e critérios de aceite. Não definem a execução de arquivos específicos de backend ou frontend.

1. **Estabelecer configuração e regras do domínio.** Definir a identidade local, o limite de upload, o catálogo em memória e o modelo de metadados. **Aceite:** valores inválidos de configuração são rejeitados e os dados respeitam o modelo desta especificação.
2. **Habilitar upload local.** Receber um arquivo, validar os limites e campos, gerar identificador/nome físico, gravar em disco e registrar metadados. **Aceite:** upload válido retorna `201`; entradas inválidas retornam os códigos especificados sem deixar registros incompletos.
3. **Disponibilizar listagem e download.** Expor metadados ordenados e permitir recuperar os bytes pelo identificador. **Aceite:** lista vazia e preenchida seguem o contrato; download retorna conteúdo anexo; identificador inexistente retorna `404`.
4. **Entregar os fluxos da interface.** Permitir selecionar, enviar, listar e baixar documentos, com estados de carregamento e mensagens de erro/sucesso. **Aceite:** a interface usa o proxy `/api` e os três fluxos funcionam contra a API.
5. **Verificar os contratos e limitações do MVP.** Cobrir respostas de sucesso e erro, persistência local do arquivo e comportamento do catálogo após reinício. **Aceite:** verificações automatizadas confirmam contratos, validações, tratamento das falhas de filesystem e a perda esperada dos metadados após reinício.