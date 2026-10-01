import NetPro from '@/components/netpro';
export default async function Page({params}:{params:Promise<{id:string}>}){return <NetPro initialContact={(await params).id}/>;}
