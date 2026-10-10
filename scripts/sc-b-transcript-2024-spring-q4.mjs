const originalCode = `(省略) //package宣言，import宣言など
 1: public UserData(HttpServletRequest request) {
 2:   this.userId = request.getParameter("userId");
 3:   this.password = request.getParameter("password");
      (省略) //入力値チェックなど
 4:   try {
 5:     MessageDigest mdObj = MessageDigest.getInstance("SHA-1");
 6:     byte[] hashByte = mdObj.digest(this.password.getBytes());
 7:     this.password = String.format("%x", new BigInteger(1, hashByte));
 8:   } catch (NoSuchAlgorithmException e) {
 9:     log.debug("error:" + e);
10:   }
      (省略)
11: }
    //引数connはDBコネクションオブジェクトを示す。
12: public void addUser(Connection conn) {
13:   PreparedStatement psObj;
14:   String sql = "INSERT INTO USER_MASTER" +
15:                "(USER_OID, USER_ID, PASSWORD, USER_NAME, ZIP_CODE" +
                    (省略);
16:   try {
17:     psObj = conn.prepareStatement(sql);
18:     psObj.setString(1, this.userOid);
19:     psObj.setString(2, this.userId);
20:     psObj.setString(3, this.password);
        (省略)
        //次の2行はデバッグログの出力
21:     System.out.println("SQL:" + sql);
22:     System.out.println("InsertData:" + this.toString());
        //次の2行はログサーバへのAPログの出力
23:     log.debug("SQL:" + sql);
24:     log.debug("InsertData:" + this.toString());
25:     psObj.execute();
26:     conn.commit();
27:   } catch (SQLException e) {
        (省略) //例外処理
28:   }
      (省略)
29: }
    (省略)`;
const correctedCode = `(省略) //package宣言，import宣言など
 1: public UserData(HttpServletRequest request) {
 2:   this.userId = request.getParameter("userId");
 3:   this.password = request.getParameter("password");
      (省略) //入力値チェックなど
 4:   try {
 5:     MessageDigest mdObj = MessageDigest.getInstance("［f］");
 6:     byte[] hashByte = mdObj.digest(this.password.getBytes());
 7:     this.password = String.format("%x", new BigInteger(1, hashByte));
 8:   } catch (NoSuchAlgorithmException e) {
 9:     log.debug("error:" + e);
        //回復不能な例外発生
10:     ［g］;
11:   }
      (省略)
12: }
    //引数connはDBコネクションオブジェクトを示す。
13: public void addUser(Connection conn) {
14:   PreparedStatement psObj = null;
15:   String sql = "INSERT INTO USER_MASTER" +
16:                "(USER_OID, USER_ID, PASSWORD, USER_NAME, ZIP_CODE" +
                    (省略);
17:   try {
18:     psObj = conn.prepareStatement(sql);
19:     psObj.setString(1, this.userOid);
20:     psObj.setString(2, this.userId);
21:     psObj.setString(3, this.password);
        (省略)
22:     UserData userMaskDataObj = this.maskUserData(this);
        //次の2行はログサーバへのAPログの出力
23:     log.debug("SQL:" + sql);
24:     log.debug("InsertData:" + userMaskDataObj.toString());
25:     psObj.execute();
26:     conn.commit();
27:   } catch (SQLException e) {
        (省略) //例外処理
28:   } ［h］ {
29:     if (psObj != null) {
30:       try {
31:         psObj.close();
32:       } catch (SQLException e) {
            (省略) //例外処理
33:       }
34:     }
35:   }
      (省略)
36: }
37: private UserData maskUserData(UserData inUserData) {
      (省略) //UserData内の重要情報を含む変数の値を＊に置換する。
38:   return userMaskDataObj;
39: }
    (省略)`;
const codeChoices = [
  {id:'ア',text:'byte[] hashByte = mdObj.digest((salt + this.password).getBytes());\nthis.password = salt + String.format("%x", new BigInteger(1, hashByte));'},
  {id:'イ',text:'byte[] hashByte = mdObj.digest((salt + this.password).getBytes());\nthis.password = String.format("%x", new BigInteger(1, hashByte));'},
  {id:'ウ',text:'byte[] hashByte = mdObj.digest(this.password.getBytes());\nbyte[] saltByte = mdObj.digest(salt.getBytes());\nthis.password = String.format("%x", new BigInteger(1, hashByte)) + String.format("%x", new BigInteger(1, saltByte));'},
  {id:'エ',text:'byte[] hashByte = mdObj.digest(this.password.getBytes());\nthis.password = salt + String.format("%x", new BigInteger(1, hashByte));'},
  {id:'オ',text:'byte[] hashByte = mdObj.digest(this.password.getBytes());\nthis.password = String.format("%x", new BigInteger(1, hashByte));\nbyte[] saltHashByte = mdObj.digest((salt + this.password).getBytes());\nthis.password = String.format("%x", new BigInteger(1, saltHashByte));'},
];
const locations = [
  {id:'ア',text:'開発ログサーバのAPログを保存したテキストファイル'},
  {id:'イ',text:'本番APサーバの/sbinディレクトリ配下のバイナリファイル'},
  {id:'ウ',text:'本番APサーバの/var/dataディレクトリ配下のCSVファイル'},
  {id:'エ',text:'本番APサーバの/var/log/serverlogディレクトリ配下のテキストファイル'},
  {id:'オ',text:'本番ログサーバのAPログを保存したテキストファイル'},
];
export const springQ4 = {
  pdfPageOffset:1,promptPages:[38,39],
  sections:[
    {id:'sec-1',heading:'導入',paragraphs:[
      {id:'p-1',printedPage:30,text:'問4 Webアプリケーションプログラムに関する次の記述を読んで，設問に答えよ。'},
      {id:'p-2',printedPage:30,text:'A社は，加工食品の製造・販売を行う従業員500名の会社である。問屋や直販店からの注文の受付に，商品の注文と在庫を管理するシステム（以下，業務システムという）を利用している。業務システムは，A社内に設置したサーバ上に構築されている。このたび，販売拡大を目指して，インターネットを使ったギフト販売を行うことになり，個人顧客から注文を受けるためのWebシステム（以下，Web受注システムという）を構築することになった。'},
      {id:'p-3',printedPage:30,text:'A社はITベンダーのB社との間で開発の委託契約を締結し，両社はWeb受注システムの開発に着手した。'},
    ]},
    {id:'sec-2',heading:'Web受注システムの要件',paragraphs:[
      {id:'p-4',printedPage:30,text:'Web受注システムの要件を表1に示す。'},
    ]},
    {id:'sec-3',heading:'Web受注システムの設計',paragraphs:[
      {id:'p-5',printedPage:32,text:'A社とB社はWeb受注システムを設計した。\nWeb受注システムのサーバで定義されるOSアカウントの一覧を表2に，所属グループとその権限を表3に示す。'},
      {id:'p-6',printedPage:32,text:'業務システムとWeb受注システムは，CSV形式のデータ連携用ファイル（以下，CSVファイルという）でデータ連携を行う。1時間ごとに業務システムのバッチサーバとWeb受注システムのバッチサーバにおいてCSVファイルを作成し，HTTPSで他方のバッチサーバに送信し，他方のバッチサーバでは受信したCSVファイルを保存する。保存したCSVファイルを使用してWeb受注システム又は業務システムのDBに対して更新処理を実行する。更新処理後のCSVファイルは，障害発生に備えて1週間保存する。'},
      {id:'p-7',printedPage:32,text:'データ連携機能のプログラム一覧を表4に示す。'},
      {id:'p-8',printedPage:33,text:'表4のうち，No.3のプログラムの内容を図1に示す。'},
      {id:'p-9',printedPage:34,text:'Web受注システムの開発が進み，結合テスト前に，A社は，設計書とソースコードのセキュリティレビューを，セキュリティ専門会社のC社に委託した。C社の情報処理安全確保支援士（登録セキスペ）のE氏は，セキュリティレビューを実施した。'},
    ]},
    {id:'sec-4',heading:'データ連携機能のセキュリティレビュー',paragraphs:[
      {id:'p-10',printedPage:34,text:'E氏は，表2～4及び図1の内容では表1の要件を満たしておらず，［a］がCSVファイルを閲覧できてしまうという問題を発見した。また，CSVファイルには重要情報が記録されるので，本番バッチサーバにアクセスできる者が不正に閲覧するリスクを軽減するための保険的対策も併せて実施することを提案した。具体的には，次のように提案した。'},
      {id:'p-11',printedPage:34,text:'(1) 問題に対しては，表2のbatchappuserについて，所属グループを［b］に変更する。\n(2) 保険的対策としては，表4のNo.3のプログラムに暗号化を行う処理を追加し，表4のNo.［c］のプログラムに復号を行う処理を追加する。'},
      {id:'p-12',printedPage:34,text:'A社は，E氏の提案どおり修正することにした。'},
    ]},
    {id:'sec-5',heading:'ユーザー登録機能のセキュリティレビュー',paragraphs:[
      {id:'p-13',printedPage:34,text:'ユーザー登録機能は，UserDataクラスによって実現している。UserDataクラスのプログラム仕様を図2に，UserDataクラスのソースコードを図3に示す。'},
      {id:'p-14',printedPage:36,text:'E氏は，図3のソースコードについて，次のように指摘した。\n・パスワードからハッシュ値を得るためのハッシュ関数が，表1の要件を満たしていない。'},
      {id:'p-15',printedPage:36,text:'・今後，メンテナンスなどで実行環境を変更した場合に，［d］行目で［e］が発生すると，25，26行目では，パスワードが平文でユーザーマスターテーブルに保存されてしまう。'},
      {id:'p-16',printedPage:36,text:'・①システム運用担当者とシステム開発者が，要件でアクセスが禁止されている情報にアクセスできてしまう。',underlines:[{label:'①',text:'システム運用担当者とシステム開発者が，要件でアクセスが禁止されている情報にアクセスできてしまう。'}]},
      {id:'p-17',printedPage:36,text:'・利用するAPサーバの実装では，変数psObjの指すメモリ領域においてメモリリークが発生する可能性がある。'},
      {id:'p-18',printedPage:36,text:'E氏の指摘を受け，システム開発者は，UserDataクラスのソースコードを修正した。修正後のUserDataクラスのソースコードを図4に示す。'},
      {id:'p-19',printedPage:37,text:'図4のソースコードについて，E氏は，セキュリティレビューを再度実施した。\nE氏は，図4のソースコードでは，レインボーテーブル攻撃を受けたときに攻撃が成立してしまうので，図2の仕様及び②図4のソースコードの6，7行目を修正すべきであると指摘した。',underlines:[{label:'②',text:'図4のソースコードの6，7行目を修正'}]},
      {id:'p-20',printedPage:37,text:'A社は，E氏の指摘の対応を完了した。その後，テストを実施し，Web受注システムをリリースした。'},
      {id:'p-21',printedPage:38,text:'不備により設問2(3)「システム運用担当者」の「アクセスできてしまう情報」及び「出力される場所」は成立しない。（令和6年7月19日追記）'},
    ]},
  ],
  materials:[
    {id:'table-1',kind:'table',classification:'B',printedPage:30,printedPages:[30,31],caption:'表1 Web受注システムの要件（続き含む）',renderText:true,text:'30・31ページの要件をNo.順に連結。',headers:['No.','要件名','要件内容'],rows:[
      ['1','機能','個人顧客が利用できる機能：商品検索，在庫照会，注文，決済，注文変更，注文キャンセル，注文照会，配送照会，ユーザー登録，ユーザー情報変更，パスワード変更，退会である。これら機能全てをアプリケーション（以下，APという）サーバに実装する。\nその他の機能：（省略）'],
      ['2','アクセス方式','Webブラウザからインターネット経由でアクセスして利用する。'],['3','想定ユーザー','個人顧客'],['4','想定ユーザー数','登録ユーザーの数が100,000までを想定'],
      ['5','重要情報¹に該当するデータ項目','氏名，住所，電話番号，メールアドレス，パスワード，銀行口座情報，決済情報'],['6','商品数','1,000'],
      ['7','想定トランザクション数','注文：1,000件／日\n注文変更・注文キャンセル：各30件／日\n注文照会・配送照会：各2,000件／日'],
      ['8','稼働時間','24時間365日。ただし，メンテナンス時間は除く。'],
      ['9','メンテナンス時間','毎週月曜日0:00～5:00。ただし，緊急の脆弱性修正プログラム適用など，他の日時に臨時でメンテナンスを実施する場合もある。'],
      ['10','稼働率目標','99.9%。ただし，メンテナンス時間は除く。'],['11','開発体制','A社とB社が協働で開発する。'],['12','開発言語／DBMS','Java／RDBMS'],
      ['13','システム基盤','APサーバ，バッチサーバ，ログサーバは，IaaS上に構築する。Web受注システムのデータベース（以下，データベースをDBという）は，クラウドサービスのマネージドDBを利用する。\n本番環境は，本番APサーバ，本番バッチサーバ，本番ログサーバ，本番DBで構成する。\n開発環境は，開発APサーバ，開発バッチサーバ，開発ログサーバ，開発DBで構成する。重要情報は保管されない。'],
      ['14','サーバOS','APサーバ，バッチサーバ，ログサーバのOSはLinuxを使用する。'],
      ['15','APログ²','APサーバのプログラム及びバッチサーバのプログラムはAPログをログサーバに転送し，ログサーバはAPログをテキストファイル形式で保存する。'],
      ['16','APサーバの標準出力と標準エラー出力','APサーバの標準出力と標準エラー出力は，リダイレクトしてAPサーバの/var/log/serverlogディレクトリ配下のテキストファイルに出力する。なお，/var/log/serverlogディレクトリのオーナーはwebappuserであり，パーミッションは774³とする。その配下のテキストファイルのオーナーはwebappuserであり，パーミッションは664³とする。'],
      ['17','システム運用','システム運用はB社に委託し，システム運用担当者はB社の要員とする。\n重要情報の取扱いは重要情報取扱運用者だけとし，重要情報取扱運用者はA社での役職が管理職以上の要員とする。\n各サーバ及び各DBの管理はシステム管理責任者が行い，システム管理責任者はA社の情報システム部の管理職とする。'],
      ['18','システムのユーザーと役割','(1) 個人顧客\nWeb受注システムのAPサーバで注文，決済などを行う。\n(2) システム運用担当者\n本番APサーバ及び本番バッチサーバの稼働を監視する。バッチ処理が異常終了したときは，手動で再実行する。これら以外のサーバについては，統合監視システムの画面から死活監視だけを行う。重要情報にアクセスしてはならない。\n(3) 重要情報取扱運用者\n本番環境に保管されている重要情報を参照し，個人顧客からの問合せに対応する。\n(4) システム開発者\n開発環境においてプログラムの開発・保守を行う。障害発生時は，本番ログサーバにアクセスして障害原因を調査する。重要情報にアクセスしてはならない。\n(5) システム管理責任者\n各サーバのOS，ミドルウェアの脆弱性修正プログラムの適用などのメンテナンス作業を行う。各サーバのOSアカウントを管理する。各DBのアカウント管理を行う。'],
      ['19','パスワードの保存','パスワードは，CRYPTREC暗号リスト（令和5年3月30日版）の電子政府推奨暗号リストに記載されているハッシュ関数でハッシュ化してDBに保存する。'],
    ],tableNotes:['注1）A社では，扱う情報を“重要情報”と“その他の情報”に分類している。','注2）システム稼働時に出力され，システム障害の際に，システム開発者が障害原因調査のために確認するファイルである。','注3）chmodコマンドの絶対モードでLinuxのパーミッションを設定する。']},
    {id:'table-2',kind:'table',classification:'B',printedPage:32,caption:'表2 OSアカウントの一覧',renderText:true,text:'No.，ユーザーID，所属グループ，定義されるサーバ，説明。',headers:['No.','ユーザーID','所属グループ','OSアカウントが定義されるサーバ','説明'],rows:[
      ['1','root','root','（省略）','システム管理責任者が利用する。'],['2','operator','operation','（省略）','システム運用担当者が利用する。'],['3','personal','personal','（省略）','重要情報取扱運用者が利用する。'],['4','developer','develop','（省略）','システム開発者が利用する。'],
      ['5','batchappuser','operation','本番バッチサーバ','データ連携機能¹の各プログラムの実行に利用される。'],['6','webappuser','personal','本番APサーバ','APサーバのプログラムの実行に利用される。'],
    ],tableNotes:['注記 root，operation，personal，developという所属グループは各サーバに定義されている。','注1）業務システムとWeb受注システムがデータ連携を行うための機能である。']},
    {id:'table-3',kind:'table',classification:'B',printedPage:32,caption:'表3 所属グループとその権限',renderText:true,text:'No.，所属グループ，権限。',headers:['No.','所属グループ','権限'],rows:[
      ['1','root','特権ユーザーである。全てのアクセス権がある。'],['2','operation','一般ユーザー権限である。本番APサーバと本番バッチサーバへのアクセス権がある。'],['3','personal','一般ユーザー権限である。本番環境へのアクセス権がある。'],['4','develop','一般ユーザー権限である。開発環境と本番ログサーバへのアクセス権がある。'],
    ],tableNotes:['注記 Web受注システムでは，OSアカウントの権限を所属グループ単位で管理する。']},
    {id:'table-4',kind:'table',classification:'B',printedPage:33,caption:'表4 データ連携機能のプログラム一覧',renderText:true,text:'No.，プログラム名，実行するサーバ，概要。',headers:['No.','プログラム名','実行するサーバ','概要'],rows:[
      ['1','バッチ処理管理1','Web受注システムのバッチサーバ','Web受注システムの各バッチ処理のプログラムの起動，監視などを行う。'],
      ['2','バッチ処理管理2','業務システムのバッチサーバ','業務システムの各バッチ処理のプログラムの起動，監視などを行う。'],
      ['3','注文データCSV出力バッチ処理','Web受注システムのバッチサーバ','Web受注システムのDB内の注文テーブルから注文データを取得し，CSVファイルに出力する。'],
      ['4','注文データCSV取込みバッチ処理','業務システムのバッチサーバ','保存されたCSVファイルを読み込んで，業務システムのDBを更新する。'],
      ['5','在庫データCSV出力バッチ処理','業務システムのバッチサーバ','業務システムのDB内の在庫テーブルから在庫データを取得し，CSVファイルに出力する。'],
      ['6','在庫データCSV取込みバッチ処理','Web受注システムのバッチサーバ','保存されたCSVファイルを読み込んで，Web受注システムのDBを更新する。'],
      ['7','データ送信1バッチ処理','Web受注システムのバッチサーバ','CSVファイルを業務システムのバッチサーバにHTTPSで送信する。'],
      ['8','データ送信2バッチ処理','業務システムのバッチサーバ','CSVファイルをWeb受注システムのバッチサーバにHTTPSで送信する。'],
      ['9','データ受信1バッチ処理','Web受注システムのバッチサーバ','受信したCSVファイルをWeb受注システムのバッチサーバの指定されたディレクトリに保存する。'],
      ['10','データ受信2バッチ処理','業務システムのバッチサーバ','受信したCSVファイルを業務システムのバッチサーバの指定されたディレクトリに保存する。'],
    ]},
    {id:'figure-1',kind:'text',classification:'A',printedPage:33,caption:'図1 No.3のプログラムの内容（抜粋）',renderText:true,text:'・注文テーブルの連携済フラグ¹が0である注文データを，CSVファイルとして平文で/var/dataディレクトリに出力する。なお，/var/dataディレクトリのオーナーはbatchappuserで，パーミッションは770²とする。CSVファイルのオーナーはbatchappuserで，パーミッションは660²とする。\n・注文テーブルの内容は，次のとおりである。\n注文ID³，注文番号，注文ユーザーID，注文日時，決済金額，銀行コード，銀行支店コード，預金種別，銀行口座番号，銀行口座氏名，注文ステータス，お届け先郵便番号，お届け先住所，お届け先電話番号，お届け先氏名，送り主郵便番号，送り主住所，送り主電話番号，送り主氏名，連携済フラグ',tableNotes:['注1）“0”はCSVファイル出力前であることを，“1”はCSVファイル出力後であることを示す。','注2）chmodコマンドの絶対モードでLinuxのパーミッションを設定する。','注3）主キーである。']},
    {id:'figure-2',kind:'text',classification:'A',printedPage:34,caption:'図2 UserDataクラスのプログラム仕様（抜粋）',renderText:true,text:'・addUserメソッドは，データをユーザーマスターテーブルに挿入する。\n・各インスタンス変数は，ユーザーマスターテーブルの各レコードに対応し，画面から入力された値をString型で保持する。\n・ユーザーマスターテーブルの列名は，次のとおりである。\nユーザーOID¹，ユーザーID，パスワード²，氏名，郵便番号，住所，電話番号，メールアドレス，作成日時，更新日時',tableNotes:['注1）主キーである。オブジェクトIDであり，データを一意に識別する文字列が格納される。','注2）パスワードのハッシュ値が格納される。']},
    {id:'figure-3',kind:'code',classification:'C',printedPage:35,caption:'図3 UserDataクラスのソースコード（抜粋）',renderText:true,text:originalCode,tableNotes:['注記 log.debug()は，引数の文字列をログサーバに送信するメソッドである。']},
    {id:'figure-4',kind:'code',classification:'C',printedPage:36,printedPages:[36,37],caption:'図4 修正後のUserDataクラスのソースコード（抜粋・続き含む）',renderText:true,text:correctedCode},
  ],
  readingOrder:['sec-1','p-1','p-2','p-3','sec-2','p-4','table-1','sec-3','p-5','table-2','table-3','p-6','p-7','table-4','p-8','figure-1','p-9','sec-4','p-10','p-11','p-12','sec-5','p-13','figure-2','figure-3','p-14','p-15','p-16','p-17','p-18','figure-4','p-19','p-20','p-21'],
  alternativeOfficialExamples:{'設問2(4)':{'f':['SHA-384','SHA-512']},'設問2(5)':{'g':['ランタイムエラーを例外としてthrowする。']}},
  officialExamplesNote:'IPA解答例に列挙された表現を全収録。ソースコードと処理内容のどちらで答える場合も，設問が指定した制御と一致することを確認する。',
  units:[
    {label:'設問1(1)',promptText:'設問1 ［データ連携機能のセキュリティレビュー］について答えよ。\n(1) 本文中の［a］に入れる適切な字句を，解答群の中から選び，記号で答えよ。\n解答群\nア システム運用担当者\nイ システム運用担当者とシステム開発者\nウ システム開発者\nエ システム開発者と重要情報取扱運用者\nオ 重要情報取扱運用者',promptPages:[38],evidenceRefs:['table-1','table-2','table-3','figure-1','p-10'],knowledge:'Linuxの所有者・所属グループのアクセス権と重要情報の取扱権限。',points:['operationのoperatorが同じグループのCSVを読めると確認する','重要情報へのアクセスが禁止されているシステム運用担当者を選ぶ'],choices:[{id:'ア',text:'システム運用担当者'},{id:'イ',text:'システム運用担当者とシステム開発者'},{id:'ウ',text:'システム開発者'},{id:'エ',text:'システム開発者と重要情報取扱運用者'},{id:'オ',text:'重要情報取扱運用者'}]},
    {label:'設問1(2)',promptText:'設問1 ［データ連携機能のセキュリティレビュー］について答えよ。\n(2) 本文中の［b］に入れる適切な所属グループを，表3中から選び答えよ。',promptPages:[38],evidenceRefs:['table-1','table-2','table-3','figure-1','p-11'],knowledge:'ファイル所有者のグループ変更による業務上不要な読取り権限の除去。',points:['重要情報取扱運用者のグループpersonalへ変更する']},
    {label:'設問1(3)',promptText:'設問1 ［データ連携機能のセキュリティレビュー］について答えよ。\n(3) 本文中の［c］に入れる適切なプログラムを，表4中から選び，No.列の番号で答えよ。',promptPages:[38],evidenceRefs:['table-4','figure-1','p-11'],knowledge:'データ連携の暗号化側と読み込み側の対応。',points:['No.3が出力した注文データを取り込むNo.4で復号する']},
    {label:'設問2(1)',promptText:'設問2 ［ユーザー登録機能のセキュリティレビュー］について答えよ。\n(1) 本文中の［d］に入れる適切な行番号を，図3中から選び，答えよ。',promptPages:[38],evidenceRefs:['figure-3','p-15'],knowledge:'MessageDigestのアルゴリズム取得とNoSuchAlgorithmExceptionによる処理経路。',points:['ハッシュアルゴリズムを取得する5行目を特定する'],reasoning:'図3の5行目でSHA-1を提供するMessageDigestを取得する。実行環境変更後にこの取得でNoSuchAlgorithmExceptionが発生すると，6・7行目のハッシュ化を行わず8～10行目のcatchに進む。例外を投げ直さないためコンストラクタが終了し，平文のpasswordを残してaddUserの25・26行目でDBに保存できてしまう。',commonMistakes:'答えるのは例外を発生させる行番号である。ログ出力の9・21～24行目やDB書込みの25行目を選ばない。'},
    {label:'設問2(2)',promptText:'設問2 ［ユーザー登録機能のセキュリティレビュー］について答えよ。\n(2) 本文中の［e］に入れる適切な字句を答えよ。',promptPages:[38],evidenceRefs:['figure-3','p-15'],knowledge:'Javaの例外とcatch後の制御の流れ。',points:['例外と答える'],reasoning:'ハッシュ関数の取得に失敗するとNoSuchAlgorithmExceptionという例外が発生する。catchでログを書くだけなので通常のインスタンスとして後続の保存処理を実行できる点を読む。'},
    {label:'設問2(3)',promptText:'設問2 ［ユーザー登録機能のセキュリティレビュー］について答えよ。\n(3) 本文中の下線①について，システム運用担当者とシステム開発者が，アクセスが禁止されているのにアクセスできてしまう情報は何か。図2中のユーザーマスターテーブルの列名で，それぞれ全て答えよ。また，その情報が出力される場所を，解答群の中から選び，それぞれ記号で答えよ。\n解答群\nア 開発ログサーバのAPログを保存したテキストファイル\nイ 本番APサーバの/sbinディレクトリ配下のバイナリファイル\nウ 本番APサーバの/var/dataディレクトリ配下のCSVファイル\nエ 本番APサーバの/var/log/serverlogディレクトリ配下のテキストファイル\nオ 本番ログサーバのAPログを保存したテキストファイル\nIPA追記：不備により「システム運用担当者」の「アクセスできてしまう情報」及び「出力される場所」は成立しない。（令和6年7月19日）',promptPages:[38],evidenceRefs:['table-1','table-2','table-3','figure-2','figure-3','p-16','p-21'],knowledge:'本番APログへの開発者のアクセス権，ログに出力する重要情報，公式訂正の対象範囲。',points:['開発者の情報はパスワード・氏名・住所・電話番号・メールアドレス','log.debugの出力先は本番ログサーバのAPログ','運用担当者の二欄は設問不成立として扱う'],fieldChoices:{'システム開発者・場所':locations},fieldPoints:{'システム開発者・情報':['図2の列名でパスワード・氏名・住所・電話番号・メールアドレスを全て挙げる'],'システム開発者・場所':['ログサーバへのAPログ出力なのでオを選ぶ'],'システム運用担当者・情報':[],'システム運用担当者・場所':[]},reasoning:'表1ではシステム開発者は障害調査のため本番ログサーバにアクセスできるが，重要情報を読んではならない。図3の24行目がUserDataを文字列化してログサーバへ送るため，図2の列のうち重要情報に当たるパスワード・氏名・住所・電話番号・メールアドレスを読めてしまう。場所はAPログを保存する本番ログサーバのテキストファイルである。運用担当者の二欄は公式の追記で設問不成立なので，推測で採点しない。'},
    {label:'設問2(4)',promptText:'設問2 ［ユーザー登録機能のセキュリティレビュー］について答えよ。\n(4) 図4中の［f］に入れる適切な字句を答えよ。',promptPages:[38],evidenceRefs:['table-1','figure-4','p-14'],knowledge:'原本が指定するCRYPTREC電子政府推奨暗号リストのハッシュ関数。',points:['SHA-256・SHA-384・SHA-512のいずれかを答える']},
    {label:'設問2(5)',promptText:'設問2 ［ユーザー登録機能のセキュリティレビュー］について答えよ。\n(5) 図4中の［g］に入れる適切な処理を，ソースコード又は具体的な処理内容のいずれかで答えよ。',promptPages:[38],evidenceRefs:['figure-3','figure-4','p-15'],knowledge:'回復不能な例外の再送出により平文のpasswordを持つオブジェクトの生成を止める。',points:['RuntimeExceptionとして例外をthrowする'],reasoning:'図4でハッシュ化に失敗したときにコンストラクタを通常終了させると，passwordが平文のまま後続処理へ渡る。catch内でRuntimeExceptionとして投げ直せば通常のオブジェクト生成を終えず，平文のパスワードをDBへ登録する経路を止められる。',commonMistakes:'採点講評が指摘する例外発生時の制御を追う。ログを出すだけ，空欄gで処理を終了しないなどの答案では，失敗状態を正常に利用できてしまう。'},
    {label:'設問2(6)',promptText:'設問2 ［ユーザー登録機能のセキュリティレビュー］について答えよ。\n(6) 図4中の［h］に入れる適切なソースコードを答えよ。',promptPages:[39],evidenceRefs:['figure-4','p-17'],knowledge:'正常時・例外時のいずれにも実行するfinally節でのPreparedStatementの解放。',points:['finallyと答える'],commonMistakes:'採点講評は例外時にも実行する資源解放を重視している。tryの末尾だけでcloseすると，途中の例外でそこに到達しない。'},
    {label:'設問2(7)',promptText:'設問2 ［ユーザー登録機能のセキュリティレビュー］について答えよ。\n(7) 本文中の下線②について，図4の6，7行目をどのように修正すればよいか。修正後の適切なソースコードを解答群の中から選び，記号で答えよ。ここで，変数saltには，addUserメソッドの呼出しごとに異なる32バイトの固定長文字列が入っているものとし，ユーザーマスターテーブルの定義に変更はないものとする。\n解答群\n'+codeChoices.map(c=>c.id+'\n'+c.text).join('\n\n'),promptPages:[39],evidenceRefs:['figure-2','figure-4','p-19'],knowledge:'ソルトをパスワードと結合してハッシュ化し，後の照合に必要なソルトをハッシュ値と一緒に保存する。',points:['ハッシュ入力にsaltとpasswordを結合する','保存値に固定長saltとハッシュ値を結合する','解答群アを選ぶ'],choices:codeChoices,commonMistakes:'イはハッシュ入力にsaltがあっても保存しない。エは保存にsaltを付けるだけでハッシュ入力が無塩である。定義変更なし，salt32バイトという条件を利用して，同じパスワード欄にsaltとハッシュ値を保持する。'},
  ],
};
