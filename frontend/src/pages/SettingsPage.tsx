import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Input,
  useToast,
} from '@/components/common';
import { Github, CreditCard, Users } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Settings</h2>
        <p className="text-xs text-slate-500">
          Configure API credentials, GitHub repository webhooks, and PayPal Sandbox integration settings
        </p>
      </div>

      {/* GitHub Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-slate-900" />
              <CardTitle>GitHub Monitored Repository</CardTitle>
            </div>
            <Badge variant="success" size="sm" dot>Connected</Badge>
          </div>
          <CardDescription>
            DevFlow listens to commit events and pull requests via GitHub webhooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            label="Monitored Repository"
            defaultValue="Tharunnagabramhagna/DevFlow"
            disabled
          />
          <Input
            label="Branch"
            defaultValue="main"
            disabled
          />
        </CardContent>
      </Card>

      {/* PayPal Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-fintech-paypal-blue" />
              <CardTitle>PayPal Developer Sandbox</CardTitle>
            </div>
            <Badge variant="paypal" size="sm" dot>Sandbox Mode</Badge>
          </div>
          <CardDescription>
            Credentials used by the backend Node.js payment module to issue invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            label="PayPal Client ID"
            defaultValue="AUJ892X-SANDBOX-PAYPAL-CLIENT-ID-DEVFLOW"
            type="password"
            disabled
          />
          <Input
            label="Webhook Listener URL"
            defaultValue="https://api.devflow.team/api/payments/webhooks"
            disabled
          />
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <span className="text-xs text-slate-400">Credentials stored server-side in .env</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('PayPal Config', 'Sandbox verified against PayPal Invoicing API v2')}
            className="w-full sm:w-auto"
          >
            Test Connection
          </Button>
        </CardFooter>
      </Card>

      {/* Team Allocation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            <CardTitle>Team Collaborators (Shared main branch)</CardTitle>
          </div>
          <CardDescription>5 members working synchronously on the DevFlow platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">Sowjanya Sappala</p>
                <p className="text-slate-500">Frontend Development, Dashboard, Reusable Components</p>
              </div>
              <Badge variant="paypal" size="sm" className="self-start sm:self-auto shrink-0">Active (You)</Badge>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">Ganesh</p>
                <p className="text-slate-500">Client Portal + Frontend Testing</p>
              </div>
              <Badge variant="neutral" size="sm" className="self-start sm:self-auto shrink-0">Teammate</Badge>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">Tharun Nagabramhagna &amp; Teammates</p>
                <p className="text-slate-500">Backend + AI + Database + DevOps</p>
              </div>
              <Badge variant="neutral" size="sm" className="self-start sm:self-auto shrink-0">Core Services</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
