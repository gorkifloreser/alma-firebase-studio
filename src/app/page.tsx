import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  Computer,
  CreditCard,
  FileText,
  Import,
  LayoutDashboard,
  List,
  MoreVertical,
  Pizza,
  ShoppingBag,
  Ticket,
  Train,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { UserNav } from '@/components/auth/UserNav';

export default async function Home() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const { user } = data;

  if (!user) {
    return redirect('/login');
  }

  const spending = [
    { icon: Computer, name: 'Pc & Coumunication', sub: 'New IPS Monitor', amount: 530, date: 'Today' },
    { icon: Pizza, name: 'Food And Drinks', sub: 'Dinner', amount: 250, date: 'Dec 28 2020' },
    { icon: ShoppingBag, name: 'Shopping', sub: 'Clothes', amount: 1020, date: 'Dec 25 2020' },
    { icon: Ticket, name: 'Entertainment', sub: 'PS5 + Cyberbunk', amount: 842, date: 'Dec 12 2020' },
    { icon: Train, name: 'Transportation', sub: 'Uber', amount: 900, date: 'Dec 5 2020' },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hello, {user.email?.split('@')[0]}</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-mesh-gradient text-primary-foreground rounded-2xl shadow-lg relative overflow-hidden">
              <CardContent className="p-6">
                <p className="text-sm text-primary-foreground/80">Balance Details</p>
                <p className="text-4xl font-bold mt-2">$900,065</p>
              </CardContent>
              <div className="absolute -right-10 -top-10">
                 <Image src="https://placehold.co/180x100/ffffff/ffffff.png" width={180} height={100} alt="money" data-ai-hint="money illustration" className="opacity-50" />
              </div>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Cash Flow</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center text-sm text-muted-foreground">LAST 31 DAYS</div>
                <div className="text-center text-2xl font-bold mt-1">USD 100,306</div>
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Income</span>
                      <span className="text-sm font-medium">USA 140,350</span>
                    </div>
                    <Progress value={70} className="h-2 bg-green-500/20 [&>div]:bg-green-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Expenses</span>
                      <span className="text-sm font-medium">- USA 40,044</span>
                    </div>
                    <Progress value={30} className="h-2 bg-red-500/20 [&>div]:bg-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Last Spending</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {spending.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="bg-secondary p-2 rounded-lg">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sub}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${item.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-mesh-gradient rounded-2xl shadow-sm relative overflow-hidden backdrop-blur-sm text-white">
               <CardContent className="p-6 text-center">
                  <div className="absolute top-4 left-4 text-white/50">
                     <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.48625 17.5258C8.38437 17.5258 7.375 17.3039 6.45812 16.8602C5.54125 16.4164 4.80125 15.7727 4.23812 14.929C3.675 14.0852 3.39375 13.1485 3.39375 12.1188C3.39375 11.2383 3.63312 10.3946 4.11187 9.58793C4.59062 8.78129 5.25312 8.1188 6.09937 7.59965C6.94562 7.08051 7.84812 6.82094 8.80687 6.82094C9.525 6.82094 10.1506 6.96528 10.6837 7.25395C11.2169 7.54262 11.5837 7.9102 11.7844 8.35668C11.985 8.80317 12.0856 9.32231 12.0856 9.9141C12.0856 10.0411 12.0744 10.1652 12.0519 10.2866C12.0294 10.4079 12.0012 10.5181 11.9675 10.617C11.9337 10.7159 11.8975 10.8067 11.8587 10.8891C11.815 10.9715 11.7712 11.0383 11.7275 11.0895C11.6375 11.1915 11.5219 11.2676 11.3806 11.3178C11.2394 11.368 11.0875 11.3932 10.925 11.3932C10.6131 11.3932 10.3519 11.2829 10.1406 11.0622C9.92937 10.8414 9.82375 10.5528 9.82375 10.1965C9.82375 9.77153 9.9575 9.43051 10.225 9.17348C10.4925 8.91645 10.825 8.78793 11.2225 8.78793C11.3125 8.78793 11.3969 8.80317 11.4756 8.83364C11.5544 8.8641 11.6238 8.91352 11.6837 8.98188L11.8356 9.16703C11.7087 9.06504 11.5662 8.98188 11.4081 8.9175C11.25 8.85313 11.0631 8.82094 10.8475 8.82094C9.945 8.82094 9.18687 9.07524 8.57312 9.58383C7.95937 10.0924 7.6525 10.8032 7.6525 11.7161C7.6525 12.4426 7.84812 13.0602 8.23937 13.5688C8.63062 14.0774 9.16312 14.3321 9.83687 14.3321C10.4387 14.3321 10.925 14.1321 11.2956 13.7322C11.6662 13.3324 11.8519 12.8395 11.8519 12.2536L11.8356 12.1891H9.8425V10.1036H14.1675L14.1237 12.3813C14.1237 13.3868 13.8219 14.2235 13.2181 14.8924C12.6144 15.5613 11.8356 16.0359 10.8819 16.3165C9.92812 16.597 8.90312 16.7373 7.80687 16.7373C6.01437 16.7373 4.54687 16.2089 3.40437 15.152C2.26187 14.0952 1.69062 12.6778 1.69062 10.9C1.69062 9.07524 2.29437 7.60204 3.49187 6.48028C4.69875 5.35852 6.2075 4.79764 7.99062 4.79764C9.2875 4.79764 10.4687 5.09457 11.5344 5.68832C12.6 6.28207 13.4356 7.12852 14.0419 8.22778L12.3356 9.24769C11.9106 8.52113 11.3394 7.98907 10.6212 7.65153C9.90312 7.31399 9.01437 7.14524 7.95562 7.14524C6.7025 7.14524 5.66437 7.48997 4.84125 8.18223C4.01812 8.87449 3.60687 9.80083 3.60687 10.9613C3.60687 12.1687 4.02187 13.1256 4.85187 13.832C5.68187 14.5385 6.69937 14.8917 7.90562 14.8917C8.5075 14.8917 9.04937 14.7869 9.53062 14.5774C10.0119 14.368 10.4081 14.0852 10.7181 13.7289L11.4581 14.8278C10.8869 15.3469 10.1944 15.7174 9.38062 15.9392C8.56687 16.1611 7.70687 16.2721 6.79937 16.2721C5.60187 16.2721 4.54687 16.0359 3.63437 15.5635C2.72187 15.0911 1.98187 14.4188 1.41437 13.5465C0.846875 12.6743 0.563125 11.6888 0.563125 10.5902C0.563125 9.40474 0.881875 8.35852 1.51812 7.45153C2.15437 6.54453 2.98187 5.8286 3.99937 5.30395C5.01687 4.7793 6.20187 4.51703 7.55437 4.51703C8.68312 4.51703 9.72937 4.73887 10.6931 5.18266C11.6569 5.62645 12.4494 6.26469 13.0706 7.09743L13.7969 6.24067C13.2531 5.5141 12.5694 4.93793 11.7456 4.51204C10.9219 4.08614 9.99437 3.87317 8.96312 3.87317C7.22812 3.87317 5.75187 4.34278 4.53437 5.28207C3.31687 6.22137 2.45312 7.4938 1.94312 9.09932C1.43312 10.7048 1.17812 12.4374 1.17812 14.297C1.17812 15.1036 1.28437 15.8446 1.49812 16.5193C1.71187 17.194 2.01812 17.7664 2.41687 18.2361L3.03812 17.3793C2.71937 16.9429 2.47937 16.5283 2.31812 16.1356C2.15687 15.7429 2.07625 15.3418 2.07625 14.9324C2.07625 13.4309 2.49125 12.1798 3.32125 11.1791C4.15125 10.1784 5.26437 9.67809 6.66062 9.67809C7.45312 9.67809 8.16437 9.83641 8.79437 10.153C9.42437 10.4696 9.8425 10.906 10.0494 11.4622C10.2562 12.0184 10.3594 12.6539 10.3594 13.3688C10.3594 14.4797 10.0469 15.3716 9.42187 16.0436C8.79687 16.7155 7.97187 17.0515 6.94687 17.0515C6.18187 17.0515 5.50187 16.8856 4.90687 16.5539C4.31187 16.2222 3.86812 15.7488 3.57562 15.1336L2.64937 15.6899C3.00562 16.3533 3.51812 16.8856 4.18687 17.2868C4.85562 17.688 5.61187 17.8886 6.45562 17.8886C7.02812 17.8886 7.56187 17.7989 8.05687 17.6193C8.55187 17.4398 8.98312 17.1899 9.35062 16.8696L9.48625 17.5258Z" fill="currentColor"/>
<path d="M21.4863 17.5258C20.3844 17.5258 19.375 17.3039 18.4581 16.8602C17.5413 16.4164 16.8013 15.7727 16.2381 14.929C15.675 14.0852 15.3938 13.1485 15.3938 12.1188C15.3938 11.2383 15.6331 10.3946 16.1119 9.58793C16.5906 8.78129 17.2531 8.1188 18.0994 7.59965C18.9456 7.08051 19.8481 6.82094 20.8069 6.82094C21.525 6.82094 22.1506 6.96528 22.6838 7.25395C23.2169 7.54262 23.5838 7.9102 23.7844 8.35668C23.985 8.80317 24.0856 9.32231 24.0856 9.9141C24.0856 10.0411 24.0744 10.1652 24.0519 10.2866C24.0294 10.4079 24.0013 10.5181 23.9675 10.617C23.9338 10.7159 23.8975 10.8067 23.8588 10.8891C23.815 10.9715 23.7713 11.0383 23.7275 11.0895C23.6375 11.1915 23.5219 11.2676 23.3806 11.3178C23.2394 11.368 23.0875 11.3932 22.925 11.3932C22.6131 11.3932 22.3519 11.2829 22.1406 11.0622C21.9294 10.8414 21.8238 10.5528 21.8238 10.1965C21.8238 9.77153 21.9575 9.43051 22.225 9.17348C22.4925 8.91645 22.825 8.78793 23.2225 8.78793C23.3125 8.78793 23.3969 8.80317 23.4756 8.83364C23.5544 8.8641 23.6238 8.91352 23.6838 8.98188L23.8356 9.16703C23.7088 9.06504 23.5663 8.98188 23.4081 8.9175C23.25 8.85313 23.0631 8.82094 22.8475 8.82094C21.945 8.82094 21.1869 9.07524 20.5731 9.58383C19.9594 10.0924 19.6525 10.8032 19.6525 11.7161C19.6525 12.4426 19.8481 13.0602 20.2394 13.5688C20.6306 14.0774 21.1631 14.3321 21.8369 14.3321C22.4388 14.3321 22.925 14.1321 23.2956 13.7322C23.6663 13.3324 23.8519 12.8395 23.8519 12.2536L23.8356 12.1891H21.8425V10.1036H26.1675L26.1238 12.3813C26.1238 13.3868 25.8219 14.2235 25.2181 14.8924C24.6144 15.5613 23.8356 16.0359 22.8819 16.3165C21.9281 16.597 20.9031 16.7373 19.8069 16.7373C18.0144 16.7373 16.5469 16.2089 15.4044 15.152C14.2619 14.0952 13.6906 12.6778 13.6906 10.9C13.6906 9.07524 14.2944 7.60204 15.4919 6.48028C16.6988 5.35852 18.2075 4.79764 19.9906 4.79764C21.2875 4.79764 22.4687 5.09457 23.5344 5.68832C24.6 6.28207 25.4356 7.12852 26.0419 8.22778L24.3356 9.24769C23.9106 8.52113 23.3394 7.98907 22.6212 7.65153C21.9031 7.31399 21.0144 7.14524 19.9556 7.14524C18.7025 7.14524 17.6644 7.48997 16.8413 8.18223C16.0181 8.87449 15.6069 9.80083 15.6069 10.9613C15.6069 12.1687 16.0219 13.1256 16.8519 13.832C17.6819 14.5385 18.6994 14.8917 19.9056 14.8917C20.5075 14.8917 21.0494 14.7869 21.5306 14.5774C22.0119 14.368 22.4081 14.0852 22.7181 13.7289L23.4581 14.8278C22.8869 15.3469 22.1944 15.7174 21.3806 15.9392C20.5669 16.1611 19.7069 16.2721 18.7994 16.2721C17.6019 16.2721 16.5469 16.0359 15.6344 15.5635C14.7219 15.0911 13.9819 14.4188 13.4144 13.5465C12.8469 12.6743 12.5631 11.6888 12.5631 10.5902C12.5631 9.40474 12.8819 8.35852 13.5181 7.45153C14.1544 6.54453 14.9819 5.8286 15.9994 5.30395C17.0169 4.7793 18.2019 4.51703 19.5544 4.51703C20.6831 4.51703 21.7294 4.73887 22.6931 5.18266C23.6569 5.62645 24.4494 6.26469 25.0706 7.09743L25.7969 6.24067C25.2531 5.5141 24.5694 4.93793 23.7456 4.51204C22.9219 4.08614 21.9944 3.87317 20.9631 3.87317C19.2281 3.87317 17.7519 4.34278 16.5344 5.28207C15.3169 6.22137 14.4531 7.4938 13.9431 9.09932C13.4331 10.7048 13.1781 12.4374 13.1781 14.297C13.1781 15.1036 13.2844 15.8446 13.4981 16.5193C13.7119 17.194 14.0181 17.7664 14.4169 18.2361L15.0381 17.3793C14.7194 16.9429 14.4794 16.5283 14.3181 16.1356C14.1569 15.7429 14.0763 15.3418 14.0763 14.9324C14.0763 13.4309 14.4913 12.1798 15.3213 11.1791C16.1513 10.1784 17.2644 9.67809 18.6606 9.67809C19.4531 9.67809 20.1644 9.83641 20.7944 10.153C21.4244 10.4696 21.8425 10.906 22.0494 11.4622C22.2563 12.0184 22.3594 12.6539 22.3594 13.3688C22.3594 14.4797 22.0469 15.3716 21.4219 16.0436C20.7968 16.7155 19.9719 17.0515 18.9469 17.0515C18.1819 17.0515 17.5019 16.8856 16.9069 16.5539C16.3119 16.2222 15.8681 15.7488 15.5756 15.1336L14.6494 15.6899C15.0056 16.3533 15.5181 16.8856 16.1869 17.2868C16.8556 17.688 17.6119 17.8886 18.4556 17.8886C19.0281 17.8886 19.5619 17.7989 20.0569 17.6193C20.5519 17.4398 20.9831 17.1899 21.3506 16.8696L21.4863 17.5258Z" fill="currentColor"/>
</svg>

                  </div>
                  <blockquote className="mt-6 text-lg font-medium text-white/90">
                  "If You Would Be Wealthy, Think Of Saving As Well As Getting"
                  </blockquote>
                  <footer className="mt-2 text-sm text-white/70">- BENJAMIN FRANKLIN</footer>
                  <div className="flex justify-center gap-1.5 mt-4">
                     <span className="h-1.5 w-1.5 rounded-full bg-white/30"></span>
                     <span className="h-1.5 w-4 rounded-full bg-white"></span>
                     <span className="h-1.5 w-1.5 rounded-full bg-white/30"></span>
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
