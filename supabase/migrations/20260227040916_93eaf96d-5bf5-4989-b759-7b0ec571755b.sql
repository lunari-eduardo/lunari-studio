
-- Admin RLS policies for subscriptions_asaas
CREATE POLICY "Admins can select all subscriptions_asaas"
ON public.subscriptions_asaas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions_asaas"
ON public.subscriptions_asaas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
