# カテゴリ設計

過去問道場型の絞込みを想定し、3系統→15カテゴリ→小分類の3階層とする。表示名を変更しても履歴が壊れないよう、アプリ内部では固定IDを使用する。

|系統|カテゴリID|表示名|優先度|問題数|
|---|---|---|---:|---:|
|テクノロジ系|`foundation_theory`|基礎理論・数値表現|A|14|
|テクノロジ系|`algorithms_data_structures`|アルゴリズム・データ構造|A|16|
|テクノロジ系|`computer_architecture`|コンピュータアーキテクチャ|S|16|
|テクノロジ系|`os_middleware`|OS・ミドルウェア|S|13|
|テクノロジ系|`system_reliability`|システム構成・信頼性|S|13|
|テクノロジ系|`databases`|データベース|S|17|
|テクノロジ系|`networks`|ネットワーク|A|18|
|テクノロジ系|`security`|セキュリティ|S|18|
|テクノロジ系|`software_engineering`|システム開発・ソフトウェア工学|S|19|
|マネジメント系|`project_management`|プロジェクト管理|A|16|
|マネジメント系|`it_service_management`|ITサービス管理|A|16|
|マネジメント系|`system_audit`|システム監査|B|16|
|ストラテジ系|`business_system_strategy`|経営・システム戦略|B|17|
|ストラテジ系|`corporate_accounting`|企業活動・会計|B|13|
|ストラテジ系|`law_standards_emerging`|法務・標準・新技術|B|18|

カテゴリ15は法務と新技術が混在するため、各問題の`domain_id`は内容に応じてテクノロジ系又はストラテジ系を設定する。小分類は`categories.json`を正本とする。
