const fragment_shader = `
    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {

        vec2 uv = fragCoord.xy/iResolution.xy;

        //size of one texel in iChannel0
        vec2 texel = 1./iResolution.xy;

        vec4 total_color;
        //see 5x5 gaussian weights in Common 
        for (int i=0;i<5;i++){
            float fi = float(i)-2.;
            for (int j=0;j<5;j++){ 
                float fj = float(j)-2.;
                vec4 color = texture(iChannel0, 
                    uv + vec2( texel.x*fi,texel.y*fj )  );
                total_color += color * gk1s[i*5 + j];
            }
        }
        
        total_color.rgb = pow(total_color.rgb,vec3(1.2));
    
        fragColor = total_color;
    }
`

export {fragment_shader}