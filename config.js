/* Public Supabase settings ONLY. Leave empty to run the offline demo.
 * NEVER put the service_role / secret key or the X client secret here.
 * xProvider: 'twitter' for Supabase's "Twitter" provider; use 'x' if your project shows the
 * newer "X / Twitter (OAuth 2.0)" provider instead.
 * authEmailDomain: username logins are stored in Supabase Auth as <username>@<this domain>.
 * No mail is ever sent there ("Confirm email" must be OFF). Set it once and never change it,
 * or existing users can't log in. */
window.KALESH_CONFIG = {
  supabaseUrl: 'https://xfbjwvwwgvptpvygauul.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmYmp3dnd3Z3ZwdHB2eWdhdXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNzE4NDksImV4cCI6MjExMDg0Nzg0OX0.xstwSdIBaALJsoGFH-wqpybo0MxBjJQAXxxN3cOptqU',
  xProvider: 'twitter',
  authEmailDomain: 'users.kalesh.app'
};
