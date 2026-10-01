import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'NetPro — Network Like a Pro',description:'Your network, remembered. Private, self-hosted personal network search.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
