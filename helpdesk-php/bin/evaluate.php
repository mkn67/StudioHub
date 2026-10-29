<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util};
use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\Retrieval\LexicalRetriever;
use StudioHub\Helpdesk\Security\Actor;
$config=require dirname(__DIR__).'/bootstrap.php';$draft=in_array('--draft',$argv,true);
$dataset=json_decode(file_get_contents(dirname($config->root).'/docs/helpdesk/evaluation.v1.json'),true,64,JSON_THROW_ON_ERROR);
$repository=new Repository(dirname($config->root).'/docs/helpdesk/knowledge/knowledge.v1.json',$config->path('config/approval-manifest.json'),$draft);
$retriever=new LexicalRetriever($repository);$actor=new Actor('evaluation:public');$results=[];$recalls=[];$complete=0;
foreach($dataset['cases']as$case){
    if($case['expected']['state']!=='answered'||($case['setup']['profile']??'')!=='public_only'||!$case['expected']['relevant_knowledge_ids']||isset($case['setup']['inject'])||($case['setup']['provider']??'')!==''){
        $results[]=['id'=>$case['id'],'stage'=>'agent/contract/adversarial','status'=>'not_executed','reason'=>'This CLI measures retrieval only; negative unit/API cases are tested separately.'];continue;
    }
    $q=end($case['conversation'])['text'];$found=array_column($retriever->search($q,$actor,null,5),'id');$gold=$case['expected']['relevant_knowledge_ids'];
    $recall=count(array_intersect($found,$gold))/count($gold);$recalls[]=$recall;if($recall>=1)$complete++;
    $results[]=['id'=>$case['id'],'stage'=>'retrieval','status'=>'executed','selected'=>$found,'gold'=>$gold,'recall_at_5'=>$recall];
}
$out=['dataset_version'=>$dataset['dataset_version'],'corpus_version'=>$repository->version,'mode'=>$draft?'CLI draft evaluation — unpublished content':'normal publication gate','provider_calls'=>0,'eligible_public_entries'=>count($repository->eligible($actor)),'retrieval_cases'=>count($recalls),'mean_recall_at_5'=>$recalls?array_sum($recalls)/count($recalls):null,'all_gold_retrieved'=>$complete,'not_executed_agent_cases'=>count($results)-count($recalls),'results'=>$results,'limitations'=>'No live answer faithfulness/tool-selection score; no actual model/provider available. Draft results do not approve publication.'];
echo json_encode($out,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
